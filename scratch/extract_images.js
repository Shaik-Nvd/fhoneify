const fs = require('fs');

try {
  const html = fs.readFileSync('cashify_dump.html', 'utf-8');
  
  // Look for Next.js __NEXT_DATA__
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (match && match[1]) {
    const data = JSON.parse(match[1]);
    console.log("Found NEXT_DATA");
    // Just dump the keys to see what's there
    console.log("Keys:", Object.keys(data.props.pageProps));
    
    // Save the parsed data to a file so we can inspect it
    fs.writeFileSync('scratch/cashify_data.json', JSON.stringify(data.props.pageProps, null, 2));
    console.log("Saved to scratch/cashify_data.json");
  } else {
    console.log("No NEXT_DATA found.");
  }
} catch (e) {
  console.error(e);
}
