// Debug UI Flow - comprehensive logging for opportunity creation
console.log('🔧 Debug UI Flow script loaded');

// Also log every opportunity creation attempt
document.addEventListener('opportunity.created', (event) => {
    console.log('🎉 DEBUG: opportunity.created event detected!', event.detail);
});

console.log('✅ Debug UI Flow script ready');