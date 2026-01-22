// Quick test script to check Instagram API
const axios = require('axios');

const INSTAGRAM_ACCESS_TOKEN = 'IGAFvuG8WtMOBBZAGI1N1RUb2ZA3UFk5SlR4OEtlU0FvdGVVZAWl0MkNsa28zQkxRejdDWmJKelYzaEswa0RnczlVd1ZA4al9lT29obl8tNVBmTjlOY0kzbE4xSmI0ZAlFQZAEx2bDh0OGI2VnhuYmpzR2I3T0xkQTZArZAkpxaFgwTThVdwZDZD';
const INSTAGRAM_APP_ID = '25876025928659168';
const keyword = 'avneetkaur_13';

async function testInstagramAPI() {
  console.log('Testing Instagram API...\n');
  
  try {
    // Test 1: Search for hashtag
    console.log('1. Testing hashtag search...');
    const hashtagSearchUrl = `https://graph.instagram.com/ig_hashtag_search?user_id=${INSTAGRAM_APP_ID}&q=${keyword}&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    try {
      const hashtagResponse = await axios.get(hashtagSearchUrl);
      console.log('✅ Hashtag search successful!');
      console.log('Response:', JSON.stringify(hashtagResponse.data, null, 2));
      
      if (hashtagResponse.data.data && hashtagResponse.data.data.length > 0) {
        const hashtagId = hashtagResponse.data.data[0].id;
        console.log(`\nHashtag ID: ${hashtagId}`);
        
        // Test 2: Get media for hashtag
        console.log('\n2. Testing media fetch for hashtag...');
        const mediaUrl = `https://graph.instagram.com/${hashtagId}/recent_media?user_id=${INSTAGRAM_APP_ID}&fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
        const mediaResponse = await axios.get(mediaUrl);
        console.log('✅ Media fetch successful!');
        console.log(`Found ${mediaResponse.data.data?.length || 0} posts`);
        console.log('Sample post:', JSON.stringify(mediaResponse.data.data?.[0], null, 2));
      }
    } catch (hashtagError) {
      console.error('❌ Hashtag search failed!');
      console.error('Status:', hashtagError.response?.status);
      console.error('Error:', hashtagError.response?.data || hashtagError.message);
    }
    
    // Test 3: Search for user
    console.log('\n3. Testing user search...');
    const userUrl = `https://graph.instagram.com/${keyword}?fields=id,username&access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    try {
      const userResponse = await axios.get(userUrl);
      console.log('✅ User search successful!');
      console.log('Response:', JSON.stringify(userResponse.data, null, 2));
    } catch (userError) {
      console.error('❌ User search failed!');
      console.error('Status:', userError.response?.status);
      console.error('Error:', userError.response?.data || userError.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
    console.error('Full error:', error.response?.data || error);
  }
}

testInstagramAPI();
