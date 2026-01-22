/**
 * Script to validate Instagram Access Token
 * Run: node validate-token.js <your-access-token>
 */

const axios = require('axios');

const accessToken = process.argv[2] || 'IGAFttaMAED4NBZAFltbEs5VlY5amxtRG51MVl1ZAEMzelV2VjdmbEtNcTJlaHJQUS1PVkdIUnVmQ0FJc0NjOEprQVZAjTVFYX3IxSFZATRk50UFlOcllnYWloQzJHRVRUZA1FNNjlJbmlXc2VNcnQ2QjdMNm5lUFpFZAVpJNlR4S3c0NAZDZD';
const appId = process.argv[3] || '25734519546187651';

async function validateToken() {
  console.log('🔍 Validating Instagram Access Token...\n');
  console.log(`Token: ${accessToken.substring(0, 20)}...`);
  console.log(`App ID: ${appId}\n`);

  // Test 1: Debug token using Facebook's debug endpoint
  console.log('📋 Test 1: Checking token status via Facebook Debug API...');
  try {
    const debugUrl = `https://graph.facebook.com/v18.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
    const debugResponse = await axios.get(debugUrl);
    
    if (debugResponse.data && debugResponse.data.data) {
      const tokenData = debugResponse.data.data;
      console.log('✅ Token Debug Info:');
      console.log(`   App ID: ${tokenData.app_id}`);
      console.log(`   Type: ${tokenData.type}`);
      console.log(`   Valid: ${tokenData.is_valid ? '✅ Yes' : '❌ No'}`);
      console.log(`   Expires At: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never'}`);
      console.log(`   Scopes: ${tokenData.scopes ? tokenData.scopes.join(', ') : 'None'}`);
      
      if (!tokenData.is_valid) {
        console.log(`\n❌ Token is INVALID!`);
        if (tokenData.error) {
          console.log(`   Error: ${tokenData.error.message}`);
        }
        return;
      }
    }
  } catch (error) {
    console.log('❌ Could not debug token:', error.response?.data?.error?.message || error.message);
    console.log('   This might mean the token format is completely wrong.\n');
  }

  // Test 2: Try to access Instagram Business Account
  console.log('\n📋 Test 2: Testing access to Instagram Business Account...');
  try {
    const accountUrl = `https://graph.facebook.com/v18.0/${appId}?fields=id,username,name&access_token=${accessToken}`;
    const accountResponse = await axios.get(accountUrl);
    
    if (accountResponse.data) {
      console.log('✅ Successfully accessed Instagram Business Account:');
      console.log(`   ID: ${accountResponse.data.id}`);
      console.log(`   Username: ${accountResponse.data.username || 'N/A'}`);
      console.log(`   Name: ${accountResponse.data.name || 'N/A'}`);
    }
  } catch (error) {
    const errorData = error.response?.data?.error || {};
    console.log('❌ Failed to access Instagram Business Account:');
    console.log(`   Error: ${errorData.message || error.message}`);
    console.log(`   Code: ${errorData.code || 'N/A'}`);
    console.log(`   Type: ${errorData.type || 'N/A'}`);
    
    if (errorData.message && errorData.message.includes('Invalid OAuth access token')) {
      console.log('\n🔴 DIAGNOSIS: Your access token is invalid or expired!');
      console.log('\n📝 How to Fix:');
      console.log('1. Go to: https://developers.facebook.com/tools/explorer/');
      console.log('2. Select your Facebook App');
      console.log('3. Click "Get Token" > "Get User Access Token"');
      console.log('4. Select these permissions:');
      console.log('   - instagram_basic');
      console.log('   - instagram_content_publish');
      console.log('   - pages_read_engagement');
      console.log('   - pages_show_list');
      console.log('5. Click "Generate Access Token"');
      console.log('6. Copy the token and update your code');
      console.log('\n💡 For Long-Lived Token (60 days):');
      console.log('   Exchange your short-lived token using:');
      console.log('   https://graph.facebook.com/v18.0/oauth/access_token?');
      console.log('   grant_type=fb_exchange_token&');
      console.log('   client_id={app-id}&');
      console.log('   client_secret={app-secret}&');
      console.log('   fb_exchange_token={short-lived-token}');
    }
  }

  // Test 3: Try hashtag search
  console.log('\n📋 Test 3: Testing hashtag search capability...');
  try {
    const hashtagUrl = `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${appId}&q=travel&access_token=${accessToken}`;
    const hashtagResponse = await axios.get(hashtagUrl);
    
    if (hashtagResponse.data && hashtagResponse.data.data) {
      console.log('✅ Hashtag search works!');
      console.log(`   Found hashtag ID: ${hashtagResponse.data.data[0]?.id}`);
    }
  } catch (error) {
    const errorData = error.response?.data?.error || {};
    console.log('❌ Hashtag search failed:');
    console.log(`   Error: ${errorData.message || error.message}`);
    console.log(`   This might be due to missing permissions or invalid token.`);
  }

  console.log('\n✅ Validation complete!\n');
}

validateToken().catch(console.error);
