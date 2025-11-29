/**
 * Utility script to find voices on Typecast.ai
 * Run with: node scripts/find-voices.js
 * 
 * Uses Direct API - no SDK required
 */

import dotenv from 'dotenv';

dotenv.config();

const TYPECAST_API_BASE = 'https://api.typecast.ai/v1';

async function findVoices() {
  const apiKey = process.env.TYPECAST_API_KEY;
  
  if (!apiKey) {
    console.error('❌ TYPECAST_API_KEY not found in .env file');
    console.log('\n📝 Create a .env file with:');
    console.log('   TYPECAST_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  console.log('\n🎤 Fetching all voices from Typecast.ai...\n');

  try {
    const response = await fetch(`${TYPECAST_API_BASE}/voices?model=ssfm-v21`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const voices = await response.json();
    
    console.log(`Found ${voices.length} voices:\n`);
    console.log('═'.repeat(80));

    // Search for Miu Kobayashi
    const miu = voices.find(v => 
      v.voice_name?.toLowerCase().includes('miu') ||
      v.voice_name?.toLowerCase().includes('kobayashi')
    );

    if (miu) {
      console.log('\n🎀 FOUND MIU KOBAYASHI! 🎀');
      console.log('─'.repeat(40));
      console.log(`   Voice ID:   ${miu.voice_id}`);
      console.log(`   Name:       ${miu.voice_name}`);
      console.log(`   Model:      ${miu.model || 'ssfm-v21'}`);
      console.log(`   Emotions:   ${miu.emotions?.join(', ') || 'default'}`);
      console.log('─'.repeat(40));
      console.log(`\n📝 Add this to your .env file:`);
      console.log(`   TYPECAST_ACTOR_ID=${miu.voice_id}\n`);
      console.log('═'.repeat(80));
    } else {
      console.log('\n⚠️ Miu Kobayashi not found in the voice list.\n');
    }

    // List all voices
    console.log('\n📋 ALL AVAILABLE VOICES:\n');
    
    voices.forEach((voice, index) => {
      console.log(`${index + 1}. ${voice.voice_name || 'Unknown'}`);
      console.log(`      ID: ${voice.voice_id}`);
      console.log(`      Model: ${voice.model || 'N/A'}`);
      console.log(`      Emotions: ${voice.emotions?.join(', ') || 'default'}`);
      console.log('');
    });

    // Show first available voice as example
    if (voices.length > 0) {
      console.log('═'.repeat(80));
      console.log('\n📝 EXAMPLE - Using the first voice:\n');
      console.log(`   TYPECAST_ACTOR_ID=${voices[0].voice_id}`);
      console.log(`   Voice Name: ${voices[0].voice_name}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n⚠️  Your API key might be invalid.');
      console.error('   Get your key from: https://typecast.ai/dashboard\n');
    }
  }
}

findVoices();
