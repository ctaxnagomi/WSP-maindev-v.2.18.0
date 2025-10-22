import { ocrEnhancements } from './ocr-enhancements.js';
import Tesseract from 'tesseract.js';

class QRGGIFProcessor {
    constructor() {
        this.cache = ocrEnhancements.cache;
        this.filters = ocrEnhancements.filters;
        this.validation = ocrEnhancements.validation;
        this.worker = null;
    }

    async initialize() {
        this.worker = await Tesseract.createWorker({
            logger: process.env.NODE_ENV === 'development' ? m => console.log(m) : null
        });
        await this.worker.loadLanguage('eng');
        await this.worker.initialize('eng');
        // Optimize for symbol recognition
        await this.worker.setParameters({
            tessedit_char_whitelist: '←↑→↓∀∃¬∧∨⊕⊗',
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR
        });
    }

    async processFrame(imageData, frameIndex) {
        const cacheKey = `frame_${frameIndex}_${Date.now()}`;
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
            return cached;
        }

        // Apply preprocessing pipeline
        let processedImage = imageData;
        
        // 1. Adaptive threshold for better symbol separation
        processedImage = await this.filters.applyAdaptiveThreshold(processedImage);
        await this.cache.setTemp(`${cacheKey}_threshold`, processedImage);

        // 2. Edge detection for boundary enhancement
        processedImage = await this.filters.applySobelEdge(processedImage);
        await this.cache.setTemp(`${cacheKey}_edges`, processedImage);

        // 3. Morphological operations for noise reduction
        processedImage = await this.filters.applyMorphological(processedImage, 'dilate');
        await this.cache.setTemp(`${cacheKey}_morph`, processedImage);

        // 4. Thinning for cleaner recognition
        processedImage = await this.filters.applyThinning(processedImage);
        await this.cache.setTemp(`${cacheKey}_thinned`, processedImage);

        // Perform OCR
        const result = await this.worker.recognize(processedImage);
        const symbol = result.data.text.trim();

        // Validate results
        const isValid = this.validateSymbol(processedImage, symbol);

        const processedResult = {
            symbol: isValid ? symbol : null,
            confidence: result.data.confidence,
            timestamp: Date.now(),
            preprocessingSteps: {
                threshold: await this.cache.getTemp(`${cacheKey}_threshold`),
                edges: await this.cache.getTemp(`${cacheKey}_edges`),
                morph: await this.cache.getTemp(`${cacheKey}_morph`),
                thinned: await this.cache.getTemp(`${cacheKey}_thinned`)
            }
        };

        // Cache the result
        await this.cache.set(cacheKey, processedResult);
        
        return processedResult;
    }

    validateSymbol(imageData, symbol) {
        if (!symbol || symbol.length !== 1) return false;

        return (
            this.validation.validateProportions(imageData, symbol) &&
            this.validation.validateStrokes(imageData) &&
            this.validation.validateSymmetry(imageData, symbol)
        );
    }

    async exportProcessingData(format = 'csv') {
        return await this.cache.exportData(format);
    }

    async clearCache() {
        await this.cache.clear();
    }

    async destroy() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
        await this.clearCache();
    }
}

export default QRGGIFProcessor;