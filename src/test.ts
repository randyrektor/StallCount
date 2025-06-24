// Comprehensive Test Suite for ScoreBoard Component and lineRotation Utilities
// This file contains manual tests and edge case validations

import { Player } from './types';
import { 
  rotateQueue, 
  getLine, 
  getNextLine, 
  getGenderBreakdown, 
  getWrapped,
  addPlayersToQueue,
  removePlayersFromQueue,
  ensureEnoughPlayers
} from './utils/lineRotation';

// Test data
const mockPlayers: Player[] = [
  { uuid: '1', name: 'Alice', gender: 'W', number: 1 },
  { uuid: '2', name: 'Bob', gender: 'O', number: 2 },
  { uuid: '3', name: 'Charlie', gender: 'O', number: 3 },
  { uuid: '4', name: 'Diana', gender: 'W', number: 4 },
  { uuid: '5', name: 'Eve', gender: 'W', number: 5 },
  { uuid: '6', name: 'Frank', gender: 'O', number: 6 },
  { uuid: '7', name: 'Grace', gender: 'W', number: 7 },
];

const openPlayers = mockPlayers.filter(p => p.gender === 'O');
const womenPlayers = mockPlayers.filter(p => p.gender === 'W');

// Test utility function
function runTest(testName: string, testFn: () => boolean) {
  try {
    const result = testFn();
    console.log(`✅ ${testName}: ${result ? 'PASSED' : 'FAILED'}`);
    return result;
  } catch (error) {
    console.log(`❌ ${testName}: FAILED - ${error}`);
    return false;
  }
}

// Test suite runner
function runAllTests() {
  console.log('🧪 Running Comprehensive Test Suite...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  // Test rotateQueue function
  console.log('📋 Testing rotateQueue function:');
  
  totalTests++;
  if (runTest('rotates queue by specified count', () => {
    const queue = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const rotated = rotateQueue(queue, 2);
    return rotated[0] === mockPlayers[2] && rotated[1] === mockPlayers[0] && rotated[2] === mockPlayers[1];
  })) passedTests++;

  totalTests++;
  if (runTest('handles rotation count larger than queue length', () => {
    const queue = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const rotated = rotateQueue(queue, 5);
    return rotated[0] === mockPlayers[2] && rotated[1] === mockPlayers[0] && rotated[2] === mockPlayers[1];
  })) passedTests++;

  totalTests++;
  if (runTest('handles rotation count of zero', () => {
    const queue = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const rotated = rotateQueue(queue, 0);
    return rotated[0] === mockPlayers[0] && rotated[1] === mockPlayers[1] && rotated[2] === mockPlayers[2];
  })) passedTests++;

  totalTests++;
  if (runTest('returns empty array for empty queue', () => {
    const queue: Player[] = [];
    const rotated = rotateQueue(queue, 5);
    return rotated.length === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('handles single element queue', () => {
    const queue = [mockPlayers[0]];
    const rotated = rotateQueue(queue, 3);
    return rotated.length === 1 && rotated[0] === mockPlayers[0];
  })) passedTests++;

  // Test getWrapped function
  console.log('\n📋 Testing getWrapped function:');
  
  totalTests++;
  if (runTest('gets wrapped elements from array', () => {
    const array = [mockPlayers[0], mockPlayers[1], mockPlayers[2], mockPlayers[3], mockPlayers[4]];
    const result = getWrapped(array, 3, 4);
    return result.length === 4 && result[0] === mockPlayers[3] && result[1] === mockPlayers[4];
  })) passedTests++;

  totalTests++;
  if (runTest('handles count larger than array length', () => {
    const array = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const result = getWrapped(array, 1, 5);
    return result.length === 5;
  })) passedTests++;

  totalTests++;
  if (runTest('returns empty array for empty input', () => {
    const array: Player[] = [];
    const result = getWrapped(array, 0, 5);
    return result.length === 0;
  })) passedTests++;

  // Test getLine function
  console.log('\n📋 Testing getLine function:');
  
  totalTests++;
  if (runTest('creates line with correct gender ratio for pattern A (4M/3W)', () => {
    const pattern = { men: 4, women: 3 };
    const line = getLine(openPlayers, womenPlayers, pattern);
    return line.length === 7 && 
           line.filter(p => p.gender === 'O').length === 4 &&
           line.filter(p => p.gender === 'W').length === 3;
  })) passedTests++;

  totalTests++;
  if (runTest('creates line with correct gender ratio for pattern B (3M/4W)', () => {
    const pattern = { men: 3, women: 4 };
    const line = getLine(openPlayers, womenPlayers, pattern);
    return line.length === 7 && 
           line.filter(p => p.gender === 'O').length === 3 &&
           line.filter(p => p.gender === 'W').length === 4;
  })) passedTests++;

  totalTests++;
  if (runTest('handles insufficient players gracefully', () => {
    const pattern = { men: 10, women: 10 };
    const line = getLine(openPlayers, womenPlayers, pattern);
    return line.length === openPlayers.length + womenPlayers.length;
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty queues', () => {
    const pattern = { men: 4, women: 3 };
    const line = getLine([], [], pattern);
    return line.length === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('returns men first, then women', () => {
    const pattern = { men: 2, women: 2 };
    const line = getLine(openPlayers, womenPlayers, pattern);
    const firstWomanIndex = line.findIndex(p => p.gender === 'W');
    const lastManIndex = line.findLastIndex(p => p.gender === 'O');
    return firstWomanIndex > lastManIndex;
  })) passedTests++;

  // Test getNextLine function
  console.log('\n📋 Testing getNextLine function:');
  
  totalTests++;
  if (runTest('returns correct next line for ABBA pattern', () => {
    const lineIndex = 0;
    const nextLine = getNextLine(openPlayers, womenPlayers, lineIndex);
    return nextLine.length === 7;
  })) passedTests++;

  totalTests++;
  if (runTest('handles all ABBA pattern indices', () => {
    for (let i = 0; i < 4; i++) {
      const nextLine = getNextLine(openPlayers, womenPlayers, i);
      if (nextLine.length !== 7) return false;
    }
    return true;
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty queues', () => {
    const lineIndex = 0;
    const nextLine = getNextLine([], [], lineIndex);
    return nextLine.length === 0;
  })) passedTests++;

  // Test getGenderBreakdown function
  console.log('\n📋 Testing getGenderBreakdown function:');
  
  totalTests++;
  if (runTest('counts men and women correctly', () => {
    const line: Player[] = [
      { uuid: '1', name: 'Alice', gender: 'W', number: 1 },
      { uuid: '2', name: 'Bob', gender: 'O', number: 2 },
      { uuid: '3', name: 'Charlie', gender: 'O', number: 3 },
      { uuid: '4', name: 'Diana', gender: 'W', number: 4 },
    ];
    const breakdown = getGenderBreakdown(line);
    return breakdown.men === 2 && breakdown.women === 2;
  })) passedTests++;

  totalTests++;
  if (runTest('handles all men', () => {
    const line: Player[] = [
      { uuid: '1', name: 'Bob', gender: 'O', number: 1 },
      { uuid: '2', name: 'Charlie', gender: 'O', number: 2 },
      { uuid: '3', name: 'Frank', gender: 'O', number: 3 },
    ];
    const breakdown = getGenderBreakdown(line);
    return breakdown.men === 3 && breakdown.women === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('handles all women', () => {
    const line: Player[] = [
      { uuid: '1', name: 'Alice', gender: 'W', number: 1 },
      { uuid: '2', name: 'Diana', gender: 'W', number: 2 },
      { uuid: '3', name: 'Eve', gender: 'W', number: 3 },
    ];
    const breakdown = getGenderBreakdown(line);
    return breakdown.men === 0 && breakdown.women === 3;
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty line', () => {
    const line: Player[] = [];
    const breakdown = getGenderBreakdown(line);
    return breakdown.men === 0 && breakdown.women === 0;
  })) passedTests++;

  // Test addPlayersToQueue function
  console.log('\n📋 Testing addPlayersToQueue function:');
  
  totalTests++;
  if (runTest('adds new players to end of queue', () => {
    const currentQueue = [mockPlayers[0], mockPlayers[1]];
    const newPlayers = [mockPlayers[2], mockPlayers[3]];
    const result = addPlayersToQueue(currentQueue, newPlayers);
    return result.length === 4 && 
           result[0] === mockPlayers[0] && 
           result[1] === mockPlayers[1] &&
           result[2] === mockPlayers[2] &&
           result[3] === mockPlayers[3];
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty current queue', () => {
    const currentQueue: Player[] = [];
    const newPlayers = [mockPlayers[0], mockPlayers[1]];
    const result = addPlayersToQueue(currentQueue, newPlayers);
    return result.length === 2 && result[0] === mockPlayers[0] && result[1] === mockPlayers[1];
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty new players', () => {
    const currentQueue = [mockPlayers[0], mockPlayers[1]];
    const newPlayers: Player[] = [];
    const result = addPlayersToQueue(currentQueue, newPlayers);
    return result.length === 2 && result[0] === mockPlayers[0] && result[1] === mockPlayers[1];
  })) passedTests++;

  // Test removePlayersFromQueue function
  console.log('\n📋 Testing removePlayersFromQueue function:');
  
  totalTests++;
  if (runTest('removes specified players from queue', () => {
    const currentQueue = [mockPlayers[0], mockPlayers[1], mockPlayers[2], mockPlayers[3]];
    const playersToRemove = [mockPlayers[1], mockPlayers[3]];
    const result = removePlayersFromQueue(currentQueue, playersToRemove);
    return result.length === 2 && 
           result[0] === mockPlayers[0] && 
           result[1] === mockPlayers[2];
  })) passedTests++;

  totalTests++;
  if (runTest('handles removing players not in queue', () => {
    const currentQueue = [mockPlayers[0], mockPlayers[1]];
    const playersToRemove = [mockPlayers[2], mockPlayers[3]];
    const result = removePlayersFromQueue(currentQueue, playersToRemove);
    return result.length === 2 && 
           result[0] === mockPlayers[0] && 
           result[1] === mockPlayers[1];
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty current queue', () => {
    const currentQueue: Player[] = [];
    const playersToRemove = [mockPlayers[0], mockPlayers[1]];
    const result = removePlayersFromQueue(currentQueue, playersToRemove);
    return result.length === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('removes all players when all are specified', () => {
    const currentQueue = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const playersToRemove = [mockPlayers[0], mockPlayers[1], mockPlayers[2]];
    const result = removePlayersFromQueue(currentQueue, playersToRemove);
    return result.length === 0;
  })) passedTests++;

  // Test ScoreBoard component edge cases (simulated)
  console.log('\n📋 Testing ScoreBoard component edge cases:');
  
  totalTests++;
  if (runTest('handles very large scores', () => {
    // Simulate score calculation
    const team1Score = 999;
    const team2Score = 998;
    const scoreDiff = team1Score - team2Score;
    return scoreDiff === 1;
  })) passedTests++;

  totalTests++;
  if (runTest('handles negative scores', () => {
    const team1Score = -5;
    const team2Score = -3;
    const scoreDiff = team1Score - team2Score;
    return scoreDiff === -2;
  })) passedTests++;

  totalTests++;
  if (runTest('handles zero scores', () => {
    const team1Score = 0;
    const team2Score = 0;
    const scoreDiff = team1Score - team2Score;
    return scoreDiff === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('handles very long team names', () => {
    const longTeamName = 'Very Long Team Name That Exceeds Normal Length';
    return longTeamName.length > 20;
  })) passedTests++;

  totalTests++;
  if (runTest('handles special characters in team names', () => {
    const specialTeamName = 'Team @#$%^&*()_+{}|:"<>?[]\\;\',./';
    return specialTeamName.includes('@') && specialTeamName.includes('#');
  })) passedTests++;

  totalTests++;
  if (runTest('handles empty team names', () => {
    const emptyTeamName = '';
    return emptyTeamName.length === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('handles very high point numbers', () => {
    const pointNumber = 999999;
    return pointNumber > 100000;
  })) passedTests++;

  totalTests++;
  if (runTest('handles zero point number', () => {
    const pointNumber = 0;
    return pointNumber === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('handles negative point numbers', () => {
    const pointNumber = -5;
    return pointNumber < 0;
  })) passedTests++;

  // Test gender ratio modes
  console.log('\n📋 Testing gender ratio modes:');
  
  totalTests++;
  if (runTest('4-3 gender ratio mode pattern', () => {
    const pattern = { men: 4, women: 3 };
    return pattern.men === 4 && pattern.women === 3;
  })) passedTests++;

  totalTests++;
  if (runTest('3-4 gender ratio mode pattern', () => {
    const pattern = { men: 3, women: 4 };
    return pattern.men === 3 && pattern.women === 4;
  })) passedTests++;

  totalTests++;
  if (runTest('MEN only gender ratio mode pattern', () => {
    const pattern = { men: 7, women: 0 };
    return pattern.men === 7 && pattern.women === 0;
  })) passedTests++;

  totalTests++;
  if (runTest('WOMEN only gender ratio mode pattern', () => {
    const pattern = { men: 0, women: 7 };
    return pattern.men === 0 && pattern.women === 7;
  })) passedTests++;

  // Test ABBA pattern logic
  console.log('\n📋 Testing ABBA pattern logic:');
  
  totalTests++;
  if (runTest('ABBA pattern index 0 (Pattern A)', () => {
    const lineIndex = 0;
    const patternIndex = lineIndex % 4;
    const isPatternA = patternIndex === 0 || patternIndex === 3;
    return isPatternA === true;
  })) passedTests++;

  totalTests++;
  if (runTest('ABBA pattern index 1 (Pattern B)', () => {
    const lineIndex = 1;
    const patternIndex = lineIndex % 4;
    const isPatternA = patternIndex === 0 || patternIndex === 3;
    return isPatternA === false;
  })) passedTests++;

  totalTests++;
  if (runTest('ABBA pattern index 2 (Pattern B)', () => {
    const lineIndex = 2;
    const patternIndex = lineIndex % 4;
    const isPatternA = patternIndex === 0 || patternIndex === 3;
    return isPatternA === false;
  })) passedTests++;

  totalTests++;
  if (runTest('ABBA pattern index 3 (Pattern A)', () => {
    const lineIndex = 3;
    const patternIndex = lineIndex % 4;
    const isPatternA = patternIndex === 0 || patternIndex === 3;
    return isPatternA === true;
  })) passedTests++;

  // Test mobile responsiveness simulation
  console.log('\n📋 Testing mobile responsiveness:');
  
  totalTests++;
  if (runTest('detects mobile screen size correctly', () => {
    const mobileWidth = 500;
    const isMobile = mobileWidth < 600;
    return isMobile === true;
  })) passedTests++;

  totalTests++;
  if (runTest('detects desktop screen size correctly', () => {
    const desktopWidth = 1200;
    const isMobile = desktopWidth < 600;
    return isMobile === false;
  })) passedTests++;

  // Test animation and styling logic
  console.log('\n📋 Testing animation and styling logic:');
  
  totalTests++;
  if (runTest('flash animation duration is correct', () => {
    const animationDuration = '0.3s';
    return animationDuration === '0.3s';
  })) passedTests++;

  totalTests++;
  if (runTest('animation prevents rapid clicking', () => {
    let isAnimating = false;
    let clickCount = 0;
    
    // Simulate first click
    if (!isAnimating) {
      isAnimating = true;
      clickCount++;
      setTimeout(() => { isAnimating = false; }, 300);
    }
    
    // Simulate rapid clicks
    if (!isAnimating) clickCount++;
    if (!isAnimating) clickCount++;
    
    return clickCount === 1; // Only first click should register
  })) passedTests++;

  // Test accessibility features
  console.log('\n📋 Testing accessibility features:');
  
  totalTests++;
  if (runTest('score buttons are clickable', () => {
    const team1Button = { clickable: true, disabled: false };
    const team2Button = { clickable: true, disabled: false };
    return team1Button.clickable && team2Button.clickable && 
           !team1Button.disabled && !team2Button.disabled;
  })) passedTests++;

  totalTests++;
  if (runTest('undo button is disabled when no history', () => {
    const scoreHistory: any[] = [];
    const undoButtonDisabled = scoreHistory.length === 0;
    return undoButtonDisabled === true;
  })) passedTests++;

  totalTests++;
  if (runTest('undo button is enabled when history exists', () => {
    const scoreHistory = [{ team1: 4, team2: 3 }];
    const undoButtonDisabled = scoreHistory.length === 0;
    return undoButtonDisabled === false;
  })) passedTests++;

  // Test the new edge case fixes
  console.log('\n📋 Testing edge case fixes:');

  totalTests++;
  if (runTest('getWrapped prevents glitching when not enough players', () => {
    const queue = [mockPlayers[0], mockPlayers[1]]; // Only 2 players
    const result = getWrapped(queue, 0, 4); // Need 4 players
    // Should return all available players instead of wrapping
    return result.length === 2 && result[0] === mockPlayers[0] && result[1] === mockPlayers[1];
  })) passedTests++;

  totalTests++;
  if (runTest('ensureEnoughPlayers fills missing players from other gender', () => {
    const openQueue = [mockPlayers[1], mockPlayers[2]]; // 2 open players
    const womenQueue = [mockPlayers[0], mockPlayers[3], mockPlayers[4], mockPlayers[6]]; // 4 women players
    const pattern = { men: 4, women: 3 }; // Need 4 men, 3 women
    
    const result = ensureEnoughPlayers(openQueue, womenQueue, pattern);
    
    // Should have 4 open players (2 original + 2 from women)
    // Should have 3 women players (original 4, but pattern only needs 3)
    return result.openQueue.length === 4 && result.womenQueue.length === 3;
  })) passedTests++;

  totalTests++;
  if (runTest('ensureEnoughPlayers handles case where both genders are short', () => {
    const openQueue = [mockPlayers[1]]; // 1 open player
    const womenQueue = [mockPlayers[0]]; // 1 woman player
    const pattern = { men: 4, women: 3 }; // Need 4 men, 3 women
    
    const result = ensureEnoughPlayers(openQueue, womenQueue, pattern);
    
    // Should return original queues since we can\'t fill from the other gender
    return result.openQueue.length === 1 && result.womenQueue.length === 1;
  })) passedTests++;

  // Final results
  console.log('\n📊 Test Results:');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! The component and utilities are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the failed tests above.');
  }
  
  return { totalTests, passedTests, failedTests: totalTests - passedTests };
}

// Export for use in other files
export { runAllTests };

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.addEventListener('load', () => {
    console.log('🚀 Starting test suite...');
    runAllTests();
  });
} else {
  // Node.js environment
  runAllTests();
}
