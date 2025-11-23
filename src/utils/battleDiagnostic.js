import { API_URL } from '../config/api.config';

/**
 * Run battle diagnostic check
 * Call this before starting a battle to see what's wrong
 * 
 * Usage:
 * const result = await runBattleDiagnostic(gamePin);
 * console.log(result);
 */
export const runBattleDiagnostic = async (gamePin) => {
  try {
    const response = await fetch(
      `${API_URL}/api/quizzes/battle/${gamePin}/diagnostic`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    // Pretty print to console
    console.log('='.repeat(60));
    console.log('🔍 BATTLE DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    console.log(`Game PIN: ${gamePin}`);
    console.log(`Time: ${data.timestamp}`);
    console.log('');
    
    if (!data.success) {
      console.error('❌ ERROR:', data.error);
      return data;
    }
    
    console.log('📊 BATTLE INFO:');
    console.log(`  Status: ${data.battle.status}`);
    console.log(`  Quiz: ${data.battle.quizTitle}`);
    console.log(`  Host ID: ${data.battle.hostId}`);
    console.log(`  You are host: ${data.battle.isUserHost ? '✅' : '❌'}`);
    console.log('');
    
    console.log('✅ VALIDATION CHECKS:');
    console.log(`  Quiz exists: ${data.validation.hasQuiz ? '✅' : '❌'}`);
    console.log(`  Has questions: ${data.validation.hasQuestions ? '✅' : '❌'} (${data.validation.questionCount} questions)`);
    console.log(`  Minimum players: ${data.validation.meetsMinimumPlayers ? '✅' : '❌'} (${data.validation.currentPlayers}/2)`);
    console.log(`  Ready players: ${data.validation.readyPlayers}/${data.validation.currentPlayers}`);
    console.log(`  Status is waiting: ${data.validation.isWaitingStatus ? '✅' : '❌'}`);
    console.log(`  CAN START: ${data.validation.canStart ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    console.log('👥 PLAYERS:');
    data.players.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.username} ${player.isHost ? '👑' : ''} ${player.isReady ? '✅' : '⏳'}`);
    });
    console.log('');
    
    console.log('💡 RECOMMENDATIONS:');
    data.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
    console.log('='.repeat(60));
    
    return data;
    
  } catch (error) {
    console.error('❌ Failed to run diagnostic:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Quick diagnostic alert for UI
 * Shows a user-friendly message
 */
export const showBattleDiagnosticAlert = async (gamePin) => {
  const result = await runBattleDiagnostic(gamePin);
  
  if (!result.success) {
    alert(`❌ Diagnostic failed: ${result.error}`);
    return result;
  }
  
  if (result.validation.canStart) {
    alert('✅ Battle is ready to start!');
  } else {
    const issues = result.recommendations.filter(r => r.startsWith('❌') || r.startsWith('⚠️'));
    alert(`Cannot start battle:\n\n${issues.join('\n')}`);
  }
  
  return result;
};
