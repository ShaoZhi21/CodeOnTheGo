# CodeOnTheGo Test Suite

This directory contains comprehensive tests for the CodeOnTheGo React Native/Expo app with Node.js backend.

## Test Structure

```
__tests__/
├── unit/           # Unit tests for individual functions and services
├── widget/         # Component tests for UI widgets
├── integration/    # Integration tests for API endpoints
├── utils/          # Test utilities and mock data
└── mocks/          # Mock implementations
```

## Test Categories

### 1. Unit Tests (`__tests__/unit/`)

**Purpose**: Test individual functions, utilities, and business logic in isolation.

**Files**:
- `quizLogic.test.ts` - Core quiz functionality (scoring, completion checking)
- `topicService.test.ts` - Topic management and user progress tracking
- `backend.test.js` - Backend API logic and business rules

**What they test**:
- Score calculation algorithms
- Quiz completion validation
- Database service functions
- Input validation
- Error handling
- Business logic correctness

### 2. Widget Tests (`__tests__/widget/`)

**Purpose**: Test React Native components and their user interactions.

**Files**:
- `QuizModal.test.tsx` - Quiz modal component functionality

**What they test**:
- Component rendering
- User interactions (button presses, selections)
- State management
- Accessibility features
- Props validation

### 3. Integration Tests (`__tests__/integration/`)

**Purpose**: Test the communication between frontend and backend APIs.

**Files**:
- `api.test.ts` - API endpoint testing

**What they test**:
- API request/response handling
- Authentication
- Error responses
- Data validation
- End-to-end API workflows

## How to Run Tests

### Prerequisites

Make sure you have the testing dependencies installed:
```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo @types/jest
```

### Running All Tests

```bash
npm test
```

### Running Specific Test Categories

```bash
# Run only unit tests
npm run test:unit

# Run only widget tests
npm run test:widget

# Run only integration tests
npm run test:integration
```

### Running Tests in Watch Mode

```bash
# Run all tests in watch mode (reruns on file changes)
npm run test:watch
```

### Running Tests with Coverage

```bash
# Run tests and generate coverage report
npm run test:coverage
```

## Test Output

### Successful Test Run
```
 PASS  __tests__/unit/quizLogic.test.ts
 PASS  __tests__/unit/topicService.test.ts
 PASS  __tests__/integration/api.test.ts

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        2.5 s
```

### Coverage Report
```
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   85.71 |    80.00 |   83.33 |   85.71 |
```

## Test Descriptions

### Quiz Logic Tests
- **Score Calculation**: Tests that quiz scores are calculated correctly based on correct/incorrect answers
- **Completion Checking**: Verifies that quizzes are marked as complete only when all questions are answered
- **Answer Validation**: Ensures that answer validation works correctly for different scenarios

### Topic Service Tests
- **Data Fetching**: Tests that topics and user progress are fetched correctly from the database
- **Progress Tracking**: Verifies that user progress updates are saved properly
- **Error Handling**: Tests database connection errors and invalid input handling

### API Integration Tests
- **Lesson Generation**: Tests the AI-powered lesson generation endpoint
- **Quiz Generation**: Verifies quiz question generation with proper structure
- **Authentication**: Tests that API endpoints properly validate user tokens
- **Error Responses**: Ensures proper error handling for invalid requests

### Component Tests
- **Rendering**: Tests that components render correctly with different props
- **User Interactions**: Verifies that user interactions (clicks, selections) work properly
- **State Management**: Tests component state changes and updates
- **Accessibility**: Ensures components have proper test IDs and accessibility features

## Writing New Tests

### Unit Test Template
```typescript
describe('FunctionName', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  test('should do something specific', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Widget Test Template
```typescript
describe('ComponentName', () => {
  test('should render correctly', () => {
    const { getByTestId } = render(<Component />);
    expect(getByTestId('component-id')).toBeTruthy();
  });

  test('should handle user interaction', () => {
    const mockCallback = jest.fn();
    const { getByTestId } = render(<Component onPress={mockCallback} />);
    
    fireEvent.press(getByTestId('button-id'));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification phases
3. **Mock External Dependencies**: Mock API calls, database operations, and external services
4. **Test Edge Cases**: Include tests for error conditions and boundary values
5. **Keep Tests Focused**: Each test should verify one specific behavior
6. **Use Test IDs**: Add testID props to components for reliable element selection

## Troubleshooting

### Common Issues

1. **Jest not found**: Make sure `@types/jest` is installed
2. **Component rendering errors**: Check that all required props are provided in tests
3. **Async test failures**: Use `async/await` and `waitFor` for asynchronous operations
4. **Mock not working**: Ensure mocks are set up in `beforeEach` and cleared properly

### Debug Mode

Run tests in debug mode to see more detailed output:
```bash
npm test -- --verbose
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines. The test suite:
- Runs quickly (under 30 seconds)
- Has no external dependencies
- Provides clear pass/fail results
- Generates coverage reports for quality metrics 