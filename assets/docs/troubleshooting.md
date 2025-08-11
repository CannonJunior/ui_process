# Process Flow Designer Troubleshooting

## Common Issues

### Node Issues
**Problem**: Nodes won't drag or move
- **Solution**: Ensure you're left-clicking and holding on the node itself
- **Note**: Task nodes are not draggable by design

**Problem**: Can't create flowlines between nodes
- **Solution**: Right-click source node → "Create Flowline" → double-click target node
- **Check**: Ensure flowline creation mode is active (source node glows blue)

### Task Issues
**Problem**: Tasks don't appear after clicking "Add Task"
- **Solution**: Check that you entered a task name and clicked "Create Task"
- **Verify**: Tasks should appear below the Start node initially

**Problem**: Can't advance tasks
- **Solution**: Ensure the anchor node has outbound flowlines
- **Check**: Use "Advance Task" from the task's right-click menu

### Tag Issues
**Problem**: Tags don't save or display
- **Solution**: Ensure both category and option are selected before adding
- **Check**: Tags should appear in the current tags area

**Problem**: Can't drag tags to Next Action slot
- **Solution**: Ensure you're dragging to the correct task's Next Action slot
- **Note**: Tags can only be dropped on their own task's slot

### Performance Issues
**Problem**: Application becomes slow with many nodes
- **Solution**: Save your work and refresh the page
- **Best Practice**: Keep workflows focused and use multiple files for large processes

### File Operations
**Problem**: Can't load saved workflow
- **Solution**: Ensure the file is a valid JSON export from the application
- **Check**: File extension should be .json

**Problem**: Workflows look different after loading
- **Solution**: This is normal - some visual adjustments may occur
- **Note**: All functional relationships are preserved

## Browser Compatibility
- **Recommended**: Chrome, Firefox, Safari (latest versions)
- **Features**: HTML5, CSS3, JavaScript ES6+ required
- **Storage**: Local file system access needed for save/load

## Getting Help
If you encounter issues not covered here:
1. Save your current work
2. Refresh the page and try again
3. Check browser console for error messages
4. Ensure all required features are enabled in your browser