// generate-qrggif.js
// Generates test QRGGIF animations with embedded unicode sequences
// QRGGIF (GG) by Wan Mohd Azizi

const { createCanvas } = require('canvas');
const GIFEncoder = require('gif-encoder');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Approved unicode sequences for testing
const SEQUENCES = [
  ['ℍ', 'ℎ', '∑', '⑂', '⑃'],  // popping dot -> star
  ['←', '↑', '→', '↓', '↔'],   // direction change
  ['∀', '∁', '∂', '∃', '∄'],   // math transform
  ['⌀', '⌁', '⌂', '⌃', '⌄'],   // technical symbols
  ['①', '②', '③', '④', '⑤']    // numbered sequence
];

// Animation specs
const FRAME_DELAY = 100;  // ms between frames
const CANVAS_SIZE = 400;  // px square
const BG_COLOR = '#ffffff';
const FG_COLOR = '#000000';

// Create a canvas for drawing
const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
const ctx = canvas.getContext('2d');

// Utility: compute SHA-256 hex of string
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Draw a frame with the given unicode character
function drawFrame(char) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = FG_COLOR;
  ctx.font = '200px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, CANVAS_SIZE/2, CANVAS_SIZE/2);
  return ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

// Generate a QRGGIF for a unicode sequence
async function generateQRGGIF(sequence, outputPath) {
  return new Promise((resolve, reject) => {
    // Create GIF encoder
    const encoder = new GIFEncoder(CANVAS_SIZE, CANVAS_SIZE);
    const outputStream = fs.createWriteStream(outputPath);
    encoder.pipe(outputStream);
    
    // Start encoding
    encoder.setRepeat(0);  // loop forever
    encoder.setDelay(FRAME_DELAY);
    encoder.setQuality(10);  // 1-30, lower = better
    encoder.writeHeader();
    
    // Add each frame
    sequence.forEach(char => {
      const frame = drawFrame(char);
      encoder.addFrame(frame.data);
    });
    
    // Finish encoding
    encoder.finish();
    outputStream.on('finish', () => {
      const hash = sha256(sequence.join('|'));
      resolve(hash);
    });
    outputStream.on('error', reject);
  });
}

// Generate QRGGIFs for all test sequences
async function generateAll(outputDir = 'test-qrggifs', useSupabase = false) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const results = [];
  for (let i = 0; i < SEQUENCES.length; i++) {
    const seq = SEQUENCES[i];
    const outPath = `${outputDir}/qrggif-${i+1}.gif`;
    try {
      const hash = await generateQRGGIF(seq, outPath);
      const result = {
        sequence: seq,
        file: outPath,
        animation_hash: hash,
        nickname: `Test QRGGIF ${i+1}`,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()  // 24h from now
      };
      results.push(result);
      console.log(`Generated ${outPath} with hash ${hash}`);
    } catch (err) {
      console.error(`Failed to generate ${outPath}:`, err);
    }
  }

  // Save results to qrg-db.json
  const dbPath = 'qrg-db.json';
  try {
    const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : { items: [] };
    db.items = db.items.filter(item => !item.nickname.startsWith('Test QRGGIF'));  // remove old test entries
    db.items.push(...results);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    console.log(`Updated ${dbPath} with ${results.length} test QRGGIFs`);
  } catch (err) {
    console.error('Failed to update qrg-db.json:', err);
  }

  // Optionally insert into Supabase
  if (useSupabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL and key required in env vars to insert to Supabase');
      return;
    }
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      for (const result of results) {
        // First insert the QRGGIF
      const { data: insertData, error: insertError } = await supabase
        .from('qr_codes')
        .insert([{
          animation_hash: result.animation_hash,
          nickname: result.nickname,
          created_at: result.created_at,
          expiration_minutes: 15, // Default minimum expiration
          expires_at: null, // Will be set when validated
          last_validated_at: null
        }]);

      if (insertError) throw insertError;

      // Then validate it to start expiration timer
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_qrggif', { 
          p_animation_hash: result.animation_hash,
          p_expiration_minutes: 15
        });
        if (error) throw error;
        console.log(`Inserted ${result.nickname} into Supabase`);
      }
    } catch (err) {
      console.error('Failed to insert into Supabase:', err);
    }
  }
}

// CLI handling
const args = process.argv.slice(2);
const useSupabase = args.includes('--supabase');
generateAll('test-qrggifs', useSupabase).catch(console.error);

/* Usage:
 * 1. Install deps: npm install canvas gif-encoder crypto @supabase/supabase-js
 * 2. Generate local only: node generate-qrggif.js
 * 3. Generate + insert to Supabase:
 *    SUPABASE_URL=your-url SUPABASE_KEY=your-key node generate-qrggif.js --supabase
 */