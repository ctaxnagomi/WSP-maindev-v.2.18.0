// Enhanced OCR Processing for QRGGIFs
// This module improves OCR accuracy through image preprocessing and validation

class EnhancedOCRProcessor {
    constructor() {
        this.tesseract = null;
        this.worker = null;
        this.preprocessCanvas = document.createElement('canvas');
        this.preprocessCtx = this.preprocessCanvas.getContext('2d');
        this.lastResults = []; // Store last N results for validation
    }

    async initialize() {
        try {
            // Initialize Tesseract with custom settings
            this.tesseract = await Tesseract.createWorker({
                logger: m => console.debug('Tesseract:', m),
                workerPath: 'https://unpkg.com/tesseract.js@v4.1.1/dist/worker.min.js',
                langPath: 'https://tessdata.projectnaptha.com/4.0.0',
                corePath: 'https://unpkg.com/tesseract.js-core@v4.1.1',
            });

            // Load language and configure
            await this.tesseract.loadLanguage('eng');
            await this.tesseract.initialize('eng');

            // Configure for symbol recognition
            await this.tesseract.setParameters({
                tessedit_char_whitelist: '←↑→↓↔∀∁∂∃∄⌀⌁⌂⌃⌄①②③④⑤ℍℎ∑⑂⑃', // Allowed symbols
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR, // Single character mode
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, // Use LSTM neural network
                tessedit_write_images: true, // Enable image debugging
                textord_min_linesize: 3.0, // Increase minimum line size
                classify_min_scale: 0.5, // Lower scale threshold for better symbol detection
            });

            console.log('OCR processor initialized successfully');
            return true;
        } catch (err) {
            console.error('Failed to initialize OCR:', err);
            return false;
        }
    }

    async preprocessFrame(imageData) {
        // Set canvas size
        this.preprocessCanvas.width = imageData.width;
        this.preprocessCanvas.height = imageData.height;

        // Draw original frame
        this.preprocessCtx.putImageData(imageData, 0, 0);

        // Apply preprocessing steps
        await this.applyThreshold();
        await this.denoise();
        await this.enhanceContrast();
        await this.scaleImage();

        return this.preprocessCanvas.toDataURL();
    }

    async applyThreshold() {
        const imageData = this.preprocessCtx.getImageData(
            0, 0, 
            this.preprocessCanvas.width, 
            this.preprocessCanvas.height
        );
        const data = imageData.data;

        // Otsu's thresholding
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            histogram[gray]++;
        }

        const threshold = this.calculateOtsuThreshold(histogram, data.length / 4);

        // Apply threshold
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            const value = gray > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = value;
        }

        this.preprocessCtx.putImageData(imageData, 0, 0);
    }

    calculateOtsuThreshold(histogram, total) {
        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;

        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;
            wF = total - wB;
            if (wF === 0) break;

            sumB += i * histogram[i];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const variance = wB * wF * Math.pow(mB - mF, 2);

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = i;
            }
        }

        return threshold;
    }

    async denoise() {
        const imageData = this.preprocessCtx.getImageData(
            0, 0, 
            this.preprocessCanvas.width, 
            this.preprocessCanvas.height
        );
        const data = imageData.data;
        const width = this.preprocessCanvas.width;
        const height = this.preprocessCanvas.height;

        // Median filter
        const tempData = new Uint8ClampedArray(data.length);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const values = [];
                
                // Gather neighborhood pixels
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const offset = ((y + dy) * width + (x + dx)) * 4;
                        values.push(data[offset]);
                    }
                }

                // Sort and take median
                values.sort((a, b) => a - b);
                const median = values[4]; // Center of sorted 9 values
                tempData[idx] = tempData[idx + 1] = tempData[idx + 2] = median;
                tempData[idx + 3] = data[idx + 3];
            }
        }

        this.preprocessCtx.putImageData(new ImageData(tempData, width, height), 0, 0);
    }

    async enhanceContrast() {
        const imageData = this.preprocessCtx.getImageData(
            0, 0, 
            this.preprocessCanvas.width, 
            this.preprocessCanvas.height
        );
        const data = imageData.data;

        // Histogram equalization
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        // Calculate cumulative histogram
        const cdf = new Array(256).fill(0);
        cdf[0] = histogram[0];
        for (let i = 1; i < 256; i++) {
            cdf[i] = cdf[i - 1] + histogram[i];
        }

        // Normalize CDF
        const cdfMin = cdf.find(x => x > 0);
        const cdfMax = cdf[255];
        const range = cdfMax - cdfMin;

        // Apply equalization
        for (let i = 0; i < data.length; i += 4) {
            const normalized = Math.round(((cdf[data[i]] - cdfMin) / range) * 255);
            data[i] = data[i + 1] = data[i + 2] = normalized;
        }

        this.preprocessCtx.putImageData(imageData, 0, 0);
    }

    async scaleImage() {
        // Scale up for better recognition
        const scaleFactor = 2;
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = this.preprocessCanvas.width * scaleFactor;
        scaledCanvas.height = this.preprocessCanvas.height * scaleFactor;
        const ctx = scaledCanvas.getContext('2d');

        // Use better scaling algorithm
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            this.preprocessCanvas, 
            0, 0, 
            scaledCanvas.width, 
            scaledCanvas.height
        );

        // Update preprocess canvas
        this.preprocessCanvas.width = scaledCanvas.width;
        this.preprocessCanvas.height = scaledCanvas.height;
        this.preprocessCtx.drawImage(scaledCanvas, 0, 0);
    }

    async recognizeSymbol(imageData) {
        try {
            // Preprocess frame
            const enhancedImage = await this.preprocessFrame(imageData);

            // Perform OCR with confidence check
            const result = await this.tesseract.recognize(enhancedImage);
            
            // Extract symbol and confidence
            const symbol = result.data.text.trim();
            const confidence = result.data.confidence;

            // Validate result
            if (this.isValidSymbol(symbol) && confidence > 70) {
                this.lastResults.push(symbol);
                if (this.lastResults.length > 5) {
                    this.lastResults.shift();
                }
                return this.getMostFrequentResult();
            }

            return null;
        } catch (err) {
            console.error('Symbol recognition failed:', err);
            return null;
        }
    }

    isValidSymbol(symbol) {
        // Check if symbol is in our allowed set
        const validSymbols = new Set([
            '←', '↑', '→', '↓', '↔',
            '∀', '∁', '∂', '∃', '∄',
            '⌀', '⌁', '⌂', '⌃', '⌄',
            '①', '②', '③', '④', '⑤',
            'ℍ', 'ℎ', '∑', '⑂', '⑃'
        ]);

        return validSymbols.has(symbol);
    }

    getMostFrequentResult() {
        const frequency = {};
        let maxFreq = 0;
        let mostFrequent = null;

        for (const symbol of this.lastResults) {
            frequency[symbol] = (frequency[symbol] || 0) + 1;
            if (frequency[symbol] > maxFreq) {
                maxFreq = frequency[symbol];
                mostFrequent = symbol;
            }
        }

        return mostFrequent;
    }

    async terminate() {
        if (this.tesseract) {
            await this.tesseract.terminate();
        }
    }
}

// Export the enhanced OCR processor
export const enhancedOCR = new EnhancedOCRProcessor();