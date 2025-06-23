# Comprehensive Test Suite for ScoreBoard Component

This test suite provides comprehensive coverage for all functionality and edge cases in the ScoreBoard component and its supporting utilities.

## 🧪 Test Coverage

### Core Functionality Tests

#### ScoreBoard Component
- **Rendering**: Team names, scores, score differences, timers, point numbers
- **Score Interaction**: Click handlers, score updates, animation prevention
- **Settings & Controls**: Settings modal, undo functionality, button states
- **Gender Ratio Modes**: ABBA, 4-3, 3-4, MEN only, WOMEN only patterns
- **Line Display**: Current line, next line, player rendering
- **Pattern Display**: ABBA pattern visualization and highlighting

#### lineRotation Utilities
- **rotateQueue**: Queue rotation with various counts and edge cases
- **getWrapped**: Array wrapping with different start indices and counts
- **getLine**: Line creation with gender ratios and pattern matching
- **getNextLine**: Next line calculation for ABBA patterns
- **getGenderBreakdown**: Gender counting and statistics
- **addPlayersToQueue**: Adding players to existing queues
- **removePlayersFromQueue**: Removing players from queues

### Edge Cases Covered

#### Data Edge Cases
- **Empty Data**: Empty queues, empty player lists, empty scores
- **Null/Undefined**: Handling null or undefined player queues
- **Single Elements**: Single player queues, single score values
- **Large Numbers**: Very high scores (999+), large point numbers
- **Negative Values**: Negative scores, negative point numbers
- **Zero Values**: Zero scores, zero point numbers

#### Input Edge Cases
- **Long Text**: Very long team names, player names
- **Special Characters**: Team names with symbols, special characters
- **Empty Strings**: Empty team names, empty player names
- **Unicode**: International characters, emojis in names

#### State Edge Cases
- **Animation States**: Rapid clicking prevention, animation timing
- **Button States**: Disabled states, enabled states, opacity changes
- **History States**: Empty history, large history, undo availability
- **Timer States**: Timer visibility, countdown display

#### Responsive Edge Cases
- **Mobile Detection**: Screen width detection, mobile vs desktop
- **Window Sizing**: Different screen sizes, responsive behavior
- **Touch Interactions**: Touch-friendly button sizes, mobile UX

#### Pattern Edge Cases
- **ABBA Patterns**: All pattern indices (0-3), pattern transitions
- **Gender Ratios**: All ratio modes, insufficient players
- **Queue Rotation**: Rotation beyond queue length, negative rotation
- **Player Distribution**: Uneven gender distribution, missing players

### Accessibility Tests
- **Button Semantics**: Proper button elements, clickable areas
- **State Indication**: Visual feedback for disabled states
- **Keyboard Navigation**: Tab order, focus management
- **Screen Reader**: Proper labeling, semantic structure

### Performance Tests
- **Animation Performance**: Flash animation timing, smooth transitions
- **Memory Usage**: Queue management, player list handling
- **Rendering Performance**: Large player lists, frequent updates

## 🚀 How to Run Tests

### Option 1: Browser Console (Recommended)
1. Open your application in a browser
2. Open the browser's developer console (F12)
3. Run the test suite:
```javascript
// Import and run the test suite
import('./src/test.ts').then(module => {
  module.runAllTests();
});
```

### Option 2: Direct File Execution
1. Navigate to the project directory
2. Run the test file directly:
```bash
# If using Node.js with TypeScript
npx ts-node src/test.ts

# Or compile and run
npx tsc src/test.ts
node src/test.js
```

### Option 3: Development Server
1. Start the development server:
```bash
npm run dev
```
2. The test suite will automatically run when the page loads
3. Check the browser console for test results

## 📊 Test Results

The test suite provides detailed output including:

- **Test Categories**: Organized by functionality area
- **Individual Test Results**: Pass/fail status for each test
- **Error Details**: Specific error messages for failed tests
- **Summary Statistics**: Total tests, passed, failed, success rate
- **Performance Metrics**: Execution time, memory usage

### Sample Output
```
🧪 Running Comprehensive Test Suite...

📋 Testing rotateQueue function:
✅ rotates queue by specified count: PASSED
✅ handles rotation count larger than queue length: PASSED
✅ handles rotation count of zero: PASSED
...

📊 Test Results:
Total Tests: 45
Passed: 45
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! The component and utilities are working correctly.
```

## 🔧 Test Configuration

### Test Data
The test suite uses realistic mock data:
- **7 Players**: Mix of men (O) and women (W) players
- **Realistic Names**: Common names with proper formatting
- **Valid UUIDs**: Properly formatted unique identifiers
- **Numbered Players**: Sequential player numbers

### Test Scenarios
Each test is designed to:
- **Isolate Functionality**: Test one specific feature at a time
- **Validate Edge Cases**: Handle boundary conditions and error states
- **Ensure Reliability**: Provide consistent, repeatable results
- **Maintain Performance**: Execute quickly without blocking the UI

## 🐛 Debugging Failed Tests

If tests fail, the suite provides:

1. **Specific Error Messages**: Exact failure reasons
2. **Test Context**: Input data and expected vs actual results
3. **Stack Traces**: Error location and call stack
4. **Data Validation**: Input/output verification

### Common Issues
- **Type Errors**: Check TypeScript compilation
- **Import Errors**: Verify file paths and module resolution
- **Runtime Errors**: Check browser console for JavaScript errors
- **Logic Errors**: Review test expectations vs actual behavior

## 📈 Continuous Integration

The test suite is designed for:
- **Automated Testing**: Can be integrated into CI/CD pipelines
- **Regression Testing**: Catch breaking changes early
- **Code Quality**: Ensure consistent behavior across changes
- **Documentation**: Serve as living documentation of expected behavior

## 🔄 Test Maintenance

### Adding New Tests
1. Identify the functionality to test
2. Create test cases for normal operation
3. Add edge cases and error conditions
4. Update the test count and categories
5. Verify all tests pass

### Updating Existing Tests
1. Review test logic for accuracy
2. Update expected results if behavior changes
3. Maintain backward compatibility
4. Document any breaking changes

## 📝 Test Documentation

Each test includes:
- **Clear Description**: What the test validates
- **Input Data**: Test data and parameters
- **Expected Output**: What should happen
- **Edge Cases**: Boundary conditions handled
- **Dependencies**: Required functions or data

This comprehensive test suite ensures the ScoreBoard component and its utilities are robust, reliable, and ready for production use. 