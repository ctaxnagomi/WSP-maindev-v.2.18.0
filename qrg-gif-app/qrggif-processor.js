// QRGGIF Processor with Enhanced OCR
import { enhancedOCR } from './enhanced-ocr.js';
import { parseGIF, decompressFrames } from 'gifuct-js';

class QRGGIFProcessor {
    constructor() {
        this.initialized = false;
        this.processingCanvas = document.createElement('canvas');
        this.processingCtx = this.processingCanvas.getContext('2d');
    }

    async initialize() {
        if (this.initialized) return true;
        
        try {
            await enhancedOCR.initialize();
            this.initialized = true;
            return true;
        } catch (err) {
            console.error('Failed to initialize QRGGIF processor:', err);
            return false;
        }
    }

    async processGIF(gifData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Parse GIF
            const gif = parseGIF(gifData);
            const frames = decompressFrames(gif, true);

            // Validate frame count
            if (frames.length < 3 || frames.length > 8) {
                throw new Error('Invalid number of frames. Expected 3-8 frames.');
            }

            // Process each frame
            const symbols = [];
            for (const frame of frames) {
                const symbol = await this.processFrame(frame);
                if (!symbol) {
                    console.warn('Failed to recognize symbol in frame');
                    continue;
                }
                symbols.push(symbol);
            }

            // Validate sequence
            if (symbols.length < 3) {
                throw new Error('Could not recognize enough symbols');
            }

            // Generate hash from symbol sequence
            return this.generateHash(symbols);

        } catch (err) {
            console.error('QRGGIF processing failed:', err);
            throw err;
        }
    }

    async processFrame(frame) {
        // Set canvas size
        this.processingCanvas.width = frame.dims.width;
        this.processingCanvas.height = frame.dims.height;

        // Create ImageData from frame
        const imageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frame.dims.width,
            frame.dims.height
        );

        // Perform OCR with enhanced processor
        return await enhancedOCR.recognizeSymbol(imageData);
    }

    generateHash(symbols) {
        // Join symbols and create SHA-256 hash
        const sequence = symbols.join('|');
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(sequence))
            .then(hashBuffer => {
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            });
    }

    async validateSymbolSequence(symbols) {
        // Check for valid transitions
        const validTransitions = {
            'ℍ': new Set(['ℎ', '∑']),
            'ℎ': new Set(['∑', '⑂']),
            '∑': new Set(['⑂', '⑃']),
            '⑂': new Set(['⑃', 'ℍ']),
            '⑃': new Set(['ℍ', 'ℎ']),
            '←': new Set(['↑', '→']),
            '↑': new Set(['→', '↓']),
            '→': new Set(['↓', '↔']),
            '↓': new Set(['↔', '←']),
            '↔': new Set(['←', '↑']),
            '∀': new Set(['∁', '∂']),
            '∁': new Set(['∂', '∃']),
            '∂': new Set(['∃', '∄']),
            '∃': new Set(['∄', '∀']),
            '∄': new Set(['∀', '∁']),
            '⌀': new Set(['⌁', '⌂']),
            '⌁': new Set(['⌂', '⌃']),
            '⌂': new Set(['⌃', '⌄']),
            '⌃': new Set(['⌄', '⌀']),
            '⌄': new Set(['⌀', '⌁']),
            '①': new Set(['②']),
            '②': new Set(['③']),
            '③': new Set(['④']),
            '④': new Set(['⑤']),
            '⑤': new Set(['①'])
        };

        // Check each transition
        for (let i = 0; i < symbols.length - 1; i++) {
            const current = symbols[i];
            const next = symbols[i + 1];
            
            if (!validTransitions[current]?.has(next)) {
                return false;
            }
        }

        return true;
    }

    async cleanup() {
        await enhancedOCR.terminate();
        this.initialized = false;
    }
}

// Export the QRGGIF processor
export const qrggifProcessor = new QRGGIFProcessor();