// Debug script for Two Sum function
function two_sum(nums, target) {
    const num_map = {};  // stores number as key and its index as value
    for (let i = 0; i < nums.length; i++) {
        const num = nums[i];
        const diff = target - num;
        if (diff in num_map) {
            return [num_map[diff], i];
        }
        num_map[num] = i;
    }
    return [];
}

// Test cases (typical Two Sum examples)
const testCases = [
    {
        input: "[2,7,11,15], 9",
        nums: [2,7,11,15],
        target: 9,
        expected: "[0,1]"
    },
    {
        input: "[3,2,4], 6", 
        nums: [3,2,4],
        target: 6,
        expected: "[1,2]"
    },
    {
        input: "[3,3], 6",
        nums: [3,3],
        target: 6, 
        expected: "[0,1]"
    }
];

console.log("🔍 Testing Two Sum Function:");
console.log("=" .repeat(50));

testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log(`Input: ${test.input}`);
    console.log(`Expected: ${test.expected}`);
    
    const result = two_sum(test.nums, test.target);
    const resultStr = JSON.stringify(result);
    
    console.log(`Actual: ${resultStr}`);
    console.log(`Match: ${resultStr === test.expected ? '✅ PASS' : '❌ FAIL'}`);
    
    if (resultStr !== test.expected) {
        console.log(`🔍 Debug info:`);
        console.log(`  - Result type: ${typeof result}, Array: ${Array.isArray(result)}`);
        console.log(`  - Expected type: string`);
        console.log(`  - Result elements: [${result.map(x => `${x}(${typeof x})`).join(', ')}]`);
    }
});

console.log("\n" + "=".repeat(50));
console.log("🎯 Key Issue: The Judge0 API likely expects STRING output, not array/object");
console.log("💡 Solution: Convert result to string format"); 