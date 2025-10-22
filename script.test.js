// Test script for PIN validation
async function testPinValidation() {
    const testCases = [
        {
            pin: '12345',
            nickname: 'TestUser1',
            expectedResult: true
        },
        {
            pin: '54321',
            nickname: 'TestUser2',
            expectedResult: true
        },
        {
            pin: '99999', // Invalid PIN
            nickname: 'TestUser3',
            expectedResult: false
        },
        {
            pin: '11111',
            nickname: '', // Empty nickname
            expectedResult: false
        }
    ];

    console.log('Starting PIN validation tests...');
    
    for (const test of testCases) {
        console.log(`Testing PIN: ${test.pin} with nickname: ${test.nickname}`);
        
        try {
            // Clear current PIN and nickname
            document.getElementById('nicknameInput').value = test.nickname;
            
            // Simulate typing PIN
            const form = new NeumorphismLoginForm();
            form.currentPin = '';
            
            for (const digit of test.pin) {
                await form.handleDigit(digit);
                // Small delay to simulate typing
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } catch (error) {
            console.error(`Test failed for PIN ${test.pin}:`, error);
        }
    }
}

// Add test button to UI
document.addEventListener('DOMContentLoaded', () => {
    const testButton = document.createElement('button');
    testButton.textContent = 'Run PIN Tests';
    testButton.className = 'neu-button';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '20px';
    testButton.style.right = '20px';
    testButton.onclick = testPinValidation;
    document.body.appendChild(testButton);
});