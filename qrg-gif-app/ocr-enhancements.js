// Cache manager for OCR processing
class OCRCache {
    constructor() {
        this.cache = new Map();
        this.tempData = new Map();
        this.maxSize = 100; // Maximum cache entries
    }

    async set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    async get(key) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < 3600000) { // 1 hour expiry
            return entry.value;
        }
        return null;
    }

    async clear() {
        this.cache.clear();
        this.tempData.clear();
    }

    // Store temporary processing data
    async setTemp(key, data) {
        this.tempData.set(key, data);
    }

    async getTemp(key) {
        return this.tempData.get(key);
    }

    // Export cache data
    async exportData(format = 'csv') {
        const data = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            value: entry.value,
            timestamp: new Date(entry.timestamp).toISOString()
        }));

        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        return JSON.stringify(data, null, 2);
    }

    convertToCSV(data) {
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(key => obj[key]));
        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

// Additional image preprocessing filters
const additionalFilters = {
    // Adaptive local threshold
    async applyAdaptiveThreshold(imageData, blockSize = 11) {
        const { width, height, data } = imageData;
        const output = new Uint8ClampedArray(data.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const neighborhood = getNeighborhood(x, y, blockSize);
                const threshold = calculateLocalThreshold(neighborhood);
                
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const value = gray > threshold ? 255 : 0;
                
                output[idx] = output[idx + 1] = output[idx + 2] = value;
                output[idx + 3] = data[idx + 3];
            }
        }
        
        return new ImageData(output, width, height);
    },

    // Sobel edge detection
    async applySobelEdge(imageData) {
        const { width, height, data } = imageData;
        const output = new Uint8ClampedArray(data.length);
        
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                let gx = 0, gy = 0;
                
                // Apply Sobel operators
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const pixel = ((y + i) * width + (x + j)) * 4;
                        const gray = (data[pixel] + data[pixel + 1] + data[pixel + 2]) / 3;
                        gx += gray * sobelX[(i + 1) * 3 + (j + 1)];
                        gy += gray * sobelY[(i + 1) * 3 + (j + 1)];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const normalized = Math.min(255, magnitude);
                
                output[idx] = output[idx + 1] = output[idx + 2] = normalized;
                output[idx + 3] = data[idx + 3];
            }
        }
        
        return new ImageData(output, width, height);
    },

    // Morphological operations
    async applyMorphological(imageData, operation = 'dilate', kernelSize = 3) {
        const { width, height, data } = imageData;
        const output = new Uint8ClampedArray(data.length);
        const half = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let values = [];
                
                // Gather neighborhood values
                for (let i = -half; i <= half; i++) {
                    for (let j = -half; j <= half; j++) {
                        const ny = y + i;
                        const nx = x + j;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            const nidx = (ny * width + nx) * 4;
                            values.push(data[nidx]);
                        }
                    }
                }
                
                // Apply operation
                let value;
                if (operation === 'dilate') {
                    value = Math.max(...values);
                } else if (operation === 'erode') {
                    value = Math.min(...values);
                }
                
                output[idx] = output[idx + 1] = output[idx + 2] = value;
                output[idx + 3] = data[idx + 3];
            }
        }
        
        return new ImageData(output, width, height);
    },

    // Thinning algorithm for better symbol recognition
    async applyThinning(imageData) {
        const { width, height, data } = imageData;
        const output = new Uint8ClampedArray(data.length);
        let changed;
        
        // Copy initial data
        output.set(data);
        
        do {
            changed = false;
            
            // Two-pass thinning
            for (let pass = 0; pass < 2; pass++) {
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = (y * width + x) * 4;
                        if (output[idx] === 0) continue; // Skip black pixels
                        
                        // Check 8-connectivity
                        const p = getNeighborhood(x, y, 3, output, width);
                        if (canRemovePixel(p, pass)) {
                            output[idx] = output[idx + 1] = output[idx + 2] = 0;
                            changed = true;
                        }
                    }
                }
            }
        } while (changed);
        
        return new ImageData(output, width, height);
    }
};

// Enhanced validation rules
const validationRules = {
    // Check symbol proportions
    validateProportions(imageData, symbol) {
        const { width, height, data } = imageData;
        const aspectRatio = width / height;
        
        // Symbol-specific proportion rules
        const rules = {
            '←': { minRatio: 1.5, maxRatio: 2.5 },
            '↑': { minRatio: 0.4, maxRatio: 0.6 },
            '∀': { minRatio: 0.8, maxRatio: 1.2 },
            // Add rules for other symbols
        };
        
        const rule = rules[symbol];
        if (rule) {
            return aspectRatio >= rule.minRatio && aspectRatio <= rule.maxRatio;
        }
        return true;
    },

    // Validate stroke consistency
    validateStrokes(imageData) {
        const { width, height, data } = imageData;
        let strokeCount = 0;
        let prevPixel = 0;
        
        // Scan horizontal lines
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixel = data[idx] > 127 ? 1 : 0;
                
                if (pixel !== prevPixel) {
                    strokeCount++;
                }
                prevPixel = pixel;
            }
        }
        
        // Expected stroke counts for valid symbols
        return strokeCount >= 2 && strokeCount <= 8;
    },

    // Check symbol symmetry
    validateSymmetry(imageData, symbol) {
        const { width, height, data } = imageData;
        let symmetryScore = 0;
        
        // Vertical symmetry check
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width / 2; x++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = (y * width + (width - 1 - x)) * 4;
                
                if (Math.abs(data[idx1] - data[idx2]) < 30) {
                    symmetryScore++;
                }
            }
        }
        
        // Normalize score
        symmetryScore /= (height * width / 2);
        return symmetryScore > 0.8;
    }
};

// Export enhanced features
export const ocrEnhancements = {
    cache: new OCRCache(),
    filters: additionalFilters,
    validation: validationRules
};