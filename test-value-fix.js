// Debug persistence for nodes and tasks
console.log('🧪 Persistence debugging loaded');

// Add event listeners to debug node and task persistence
document.addEventListener('node.created', (event) => {
    console.log('🎉 DEBUG: node.created event detected!', event.detail);
});

document.addEventListener('task.created', (event) => {
    console.log('🎉 DEBUG: task.created event detected!', event.detail);
});

console.log('✅ Node and task persistence debugging ready');