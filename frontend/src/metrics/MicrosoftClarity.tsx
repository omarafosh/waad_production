import PropTypes from 'prop-types';
function loadMicrosoftClarity(clarityId) {
  if (!clarityId) {
    console.warn('Microsoft Clarity ID is missing.');
    return;
  }

  // Check if the script is already added
  if (document.getElementById('microsoft-clarity-script')) return;

  // Create the Clarity script
  const script = document.createElement('script');
  script.async = true;
  script.id = 'microsoft-clarity-script';

  // Security: Sanitize clarityId to prevent XSS injection
  // Clarity IDs are typically alphanumeric (e.g., 'abcdef123')
  const safeClarityId = clarityId.replace(/[^a-zA-Z0-9]/g, '');

  script.innerHTML = `
    (function(c,l,a,r,i,t,y) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", "${safeClarityId}");
  `;
  document.body.appendChild(script);
}

export default function MicrosoftClarity({ clarityId }) {
  if (clarityId) {
    loadMicrosoftClarity(clarityId); // Load the script using the utility function
  }

  return null; // This component doesn't render any visible content
}

MicrosoftClarity.propTypes = { clarityId: PropTypes.string };
