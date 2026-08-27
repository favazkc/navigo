// CloudFront Function — SPA route rewrite
// Attach to: Default behaviour (*), Viewer Request event
//
// Logic: if the request path has no file extension (i.e. it's a SPA route
// like /dashboard or /projects/123), rewrite it to /index.html so S3
// serves the app shell. Paths with extensions (/assets/app.js, /logo.png)
// pass through unchanged so S3 returns the real file.

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If the path contains a dot after the last slash, it's a real file — pass through
  var lastSegment = uri.split('/').pop();
  if (lastSegment && lastSegment.indexOf('.') !== -1) {
    return request;
  }

  // No extension → SPA route → serve index.html
  request.uri = '/index.html';
  return request;
}
