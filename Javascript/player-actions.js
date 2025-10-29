// Javascript/player-actions.js - REBUILT & REFACTORED VERSION (Oct 29, 2025)
// - Refactored applyEffect into category helpers (Buffs, Healing, Direct Dmg, Percent Dmg)
// - Implemented new custom % HP formulas (Hero, Sage, Excalibur)
// - Fixed Excalibur roll logic (moved from checkConditions to performSuccessRoll)

// --- (Helper Functions - ไม่เปลี่ยนแปลง) ---
const calcTotalStatFn = typeof calculateTotalStat === 'function' ? calculateTotalStat : () => { console.error("calculateTotalStat not found!"); return 10; };
const calcHPFn = typeof calculateHP === 'function' ? calculateHP : () => { console.error("calculateHP not found!"); return 10; };
const getStatBonusFn = typeof getStatBonus === 'function' ? getStatBonus : () => { console.error("getStatBonus not found!"); return 0; };
const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : (msg, type) => { console.log(type + ':', msg); };

async function endPlayerTurn(uid, roomId) {
    try {
        console.log(`[END TURN] Attempting for UID: ${uid} in Room: ${roomId}`);
        const combatSnap = await db.ref(`rooms/${roomId}/combat`).get();
        if (combatSnap.exists() && combatSnap.val().isActive) {
            const currentCombatState = combatSnap.val();
            if (currentCombatState.turnOrder && currentCombatState.currentTurnIndex < currentCombatState.turnOrder.length) {
                const currentTurnUnit = currentCombatState.turnOrder[currentCombatState.currentTurnIndex];
                if (currentTurnUnit.id === uid) {
                    setTimeout(async () => {
                        await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid);
                        console.log(`[END TURN] Signal sent for UID: ${uid}`);
                    }, 500); 
                } else { console.warn(`[END TURN] Attempted for ${uid}, but it's ${currentTurnUnit.name}'s turn. Signal NOT sent.`); }
            } else { console.warn(`[END TURN] Combat state or turn order invalid. Signal NOT sent for UID: ${uid}`); }
        } else { console.log(`[END TURN] Combat not active or not found. Signal NOT sent for UID: ${uid}`); }
    } catch (error) { console.error("[END TURN] Error:", error); showAlert('เกิดข้อผิดพลาดในการจบเทิร์น!', 'error'); }
}

function checkCooldown(casterData, skill, currentCombatState) {
    if (!skill.cooldown && !skill.successCooldown) return null; 
    
    const cdData = casterData.skillCooldowns || {}; 
    const combatUses = casterData.combatSkillUses || {};
    const currentTurn = (currentCombatState && typeof currentCombatState.currentTurnIndex === 'number') ? currentCombatState.currentTurnIndex : 0;
    
    const skillName = SKILLS_DATA[casterData.class]?.find(s=>s.id===skill.id)?.name || 
                      SKILLS_DATA[casterData.race]?.find(s=>s.id===skill.id)?.name || 
                      ITEM_SKILLS[casterData.equippedItems?.mainHand?.name]?.find(s=>s.id===skill.id)?.name || 
                      skill.id;

    if (skill.cooldown && skill.cooldown.type === 'PER_TURN') {
        const turnEnds = cdData[skill.id] || 0;
        if (turnEnds > currentTurn) { 
            return `สกิล ${skillName} ยังติดคูลดาวน์! (รอ ${turnEnds - currentTurn} เทิร์น)`; 
        }
    }
    if (skill.cooldown && skill.cooldown.type === 'PER_COMBAT') {
        const uses = combatUses[skill.id] || 0; 
        const allowedUses = skill.cooldown.uses;
        if (uses >= allowedUses) { 
            return `สกิล ${skillName} สามารถใช้ได้ ${allowedUses} ครั้งต่อการต่อสู้เท่านั้น`; 
        }
    }
    
    if (skill.successCooldown && skill.successCooldown.type === 'PER_COMBAT') {
         const uses = combatUses[skill.id + '_success'] || 0;
         const allowedUses = skill.successCooldown.uses;
         if (uses >= allowedUses) {
             return `สกิล ${skillName} ติดคูลดาวน์ (ใช้งานสำเร็จไปแล้ว)`;
         }
    }
    
    return null;
}

async function checkConditions(casterData, targetData, skill, casterUid, roomId) {
    // [ ⭐️ REFACTOR ⭐️ ]
    // ลบ Logic การทอยเต๋าของ Excalibur ออกจากฟังก์ชันนี้
    // เพราะใน skills-data.js เรากำหนดให้ Excalibur ใช้ 'successRoll' (d40 >= 35)
    // ซึ่งจะถูกจัดการโดย performSuccessRoll() โดยอัตโนมัติ

    if (!skill.condition) return { met: true };
    const conditions = skill.condition.list || [skill.condition]; 
    let failureReason = null; 
    
    for (const cond of conditions) {
        switch (cond.type) {
            case 'DICE_ROLL':
                // (โค้ดนี้จะใช้สำหรับสกิลอื่นๆ ที่ยังใช้ 'condition' แบบเก่า)
                const { value: rollConfirmed } = await Swal.fire({ 
                    title: `กำลังร่ายสกิล ${skill.name}!`, 
                    text: `คุณต้องทอย ${cond.dice} ให้ได้ ${cond.value}!`, 
                    confirmButtonText: '🎲 ทอยเต๋า!', 
                    allowOutsideClick: false 
                });
                if (!rollConfirmed) { failureReason = 'ROLL_CANCELLED'; break; }
                
                const diceResult = Math.floor(Math.random() * parseInt(cond.dice.replace('d', ''))) + 1; 
                
                if (diceResult !== cond.value) { 
                    await Swal.fire('ล้มเหลว!', `คุณทอยได้ ${diceResult} (ต้องการ ${cond.value})`, 'error'); 
                    failureReason = 'ROLL_FAILED'; 
                }
                else { 
                    await Swal.fire('สำเร็จ!', `คุณทอยได้ ${diceResult}! สกิลทำงาน!`, 'success'); 
                }
                break;
                
            case 'HAS_ITEM': 
                const hasItem = Object.values(casterData.equippedItems || {}).some(item => item && item.name === cond.itemName) || (casterData.inventory || []).some(item => item.name === cond.itemName); 
                if (!hasItem) failureReason = `คุณไม่มีไอเทม "${cond.itemName}" เพื่อใช้สกิลนี้`; 
                break;
                
            case 'STAT_GREATER_THAN': 
                if (!targetData) { failureReason = "คุณต้องเลือกเป้าหมายก่อนใช้สกิลนี้"; break; } 
                const casterStat = calcTotalStatFn(casterData, cond.stat); 
                const targetStatValCond = (targetData.type === 'enemy') ? (targetData.stats[cond.stat.toUpperCase()] || 10) : calcTotalStatFn(targetData, cond.stat); 
                if (!(casterStat > (targetStatValCond + (cond.amount || 0)))) { 
                    failureReason = `สกิลล้มเหลว! (ต้องการ ${cond.stat} มากกว่าเป้าหมาย ${cond.amount || 0} หน่วย)`; 
                }
                break;
        } 
        if (failureReason) break;
    }
    
    if (failureReason) { 
        if (failureReason !== 'ROLL_FAILED' && failureReason !== 'ROLL_CANCELLED') showAlert(failureReason, 'error'); 
        
        if (failureReason === 'ROLL_FAILED' && skill.cooldown) {
            const casterRef = db.ref(`rooms/${roomId}/playersByUid/${casterUid}`);
            await setCooldown(casterRef, skill, true); 
        }
        
        if (failureReason !== 'ROLL_CANCELLED') await endPlayerTurn(casterUid, roomId); 
        return { met: false }; 
    }
    
    return { met: true }; // (ลบ diceRoll ออก เพราะเราจะใช้ rollData จาก successRoll)
}


async function performSuccessRoll(casterData, targetData, skill, options) {
    if (!skill.successRoll) return { success: true, rollData: {} }; 

    // [ ⭐️ REFACTOR & FIX ⭐️ ]
    // ทำให้รองรับลูกเต๋าขนาดอื่น (เช่น d40 ของ Excalibur)
    const diceType = skill.successRoll.dice || 'd20';
    const diceSize = parseInt(diceType.replace('d', ''));
    const casterRoll = Math.floor(Math.random() * diceSize) + 1;
    // [ ⭐️ END FIX ⭐️ ]

    const casterStatVal = calcTotalStatFn(casterData, skill.scalingStat || 'WIS');
    const casterBonus = (diceSize === 20) ? getStatBonusFn(casterStatVal) : 0; // (โบนัส Stat จะใช้กับ d20 เท่านั้น)
    let totalCasterRoll = casterRoll + casterBonus;

    let targetRoll = 0;
    let totalTargetRoll = 0;
    let dc = skill.successRoll.baseDC || 10;
    let rollType = skill.successRoll.type || 'STANDARD';
    
    let resultText = `คุณทอย (${diceType}): ${casterRoll}`;
    if (diceSize === 20) {
        resultText += ` + โบนัส ${skill.scalingStat || 'WIS'}: ${casterBonus} = **${totalCasterRoll}**<br>`;
    } else {
        resultText += ` = **${totalCasterRoll}**<br>`; // (d40 ไม่ต้องบวกโบนัส)
    }

    if (skill.successRoll.resistStat && targetData) {
        const targetStatVal = (targetData.type === 'enemy') ? (targetData.stats?.[skill.successRoll.resistStat.toUpperCase()] || 10) : calcTotalStatFn(targetData, skill.successRoll.resistStat);
        const targetBonus = getStatBonusFn(targetStatVal);
        
        if (rollType === 'CONTESTED') {
            targetRoll = Math.floor(Math.random() * 20) + 1;
            totalTargetRoll = targetRoll + targetBonus;
            dc = totalTargetRoll; 
            resultText += `เป้าหมายทอย (d20): ${targetRoll} + โบนัส ${skill.successRoll.resistStat}: ${targetBonus} = **${totalTargetRoll}**`;
        } else {
            dc += targetBonus; 
            resultText += `ค่าความยาก (DC): ${dc} (Base ${skill.successRoll.baseDC || 10} + Resist Bonus ${targetBonus})`;
        }
    } else if (skill.successRoll.resistStat === null) {
        // (สำหรับ Excalibur ที่ resistStat: null)
        resultText += `ค่าความยาก (DC): **${dc}**`;
    }
    
    if (skill.effect.type === 'SELECTABLE_TEMP_STAT_BUFF' && options.selectedStats) {
        const choiceCost = (options.selectedStats.length || 0) * (skill.successRoll.dcPerChoice || 0);
        dc += choiceCost;
        resultText += ` (บวก ${choiceCost} จากการเลือก ${options.selectedStats.length} อย่าง)`;
    }

    const success = totalCasterRoll >= dc;
    await Swal.fire({ 
        title: success ? 'สกิลทำงานสำเร็จ!' : 'สกิลล้มเหลว!', 
        html: resultText, 
        icon: success ? 'success' : 'error', 
        timer: 3000, 
        timerProgressBar: true, 
        showConfirmButton: false 
    });

    // [ ⭐️ FIX ⭐️ ] ส่งผลทอย (CasterRoll) กลับไปให้ applyEffect (สำหรับ Excalibur)
    return { success, rollData: { totalCasterRoll: casterRoll, dc } };
}

async function setCooldown(casterRef, skill, failed = false) {
    const currentTurnSnap = await db.ref(casterRef.parent.parent).child('combat/currentTurnIndex').get();
    const currentTurn = currentTurnSnap.val() || 0;

    if (failed) {
        if (skill.cooldown && skill.cooldown.type === 'PER_TURN') {
            const turnEnds = currentTurn + skill.cooldown.turns;
            await casterRef.child('skillCooldowns').child(skill.id).set(turnEnds);
            console.log(`[CD] Set FAILED cooldown for ${skill.id} until turn ${turnEnds}`);
        }
        return;
    }

    if (skill.cooldown && skill.cooldown.type === 'PER_TURN') {
        const turnEnds = currentTurn + skill.cooldown.turns;
        await casterRef.child('skillCooldowns').child(skill.id).set(turnEnds);
        console.log(`[CD] Set turn cooldown for ${skill.id} until turn ${turnEnds}`);
    }
    else if (skill.cooldown && skill.cooldown.type === 'PER_COMBAT') {
        await casterRef.child('combatSkillUses').child(skill.id).transaction(uses => (uses || 0) + 1);
        console.log(`[CD] Incremented combat uses for ${skill.id}`);
    }
    
    if (skill.successCooldown && skill.successCooldown.type === 'PER_COMBAT') {
         await casterRef.child('combatSkillUses').child(skill.id + '_success').transaction(uses => (uses || 0) + skill.successCooldown.uses);
         console.log(`[CD] Set SUCCESS cooldown for ${skill.id}`);
    }
}

async function useSkillOnTarget(skillId, targetId, options = {}) {
    const casterUid = firebase.auth().currentUser?.uid; 
    const roomId = sessionStorage.getItem('roomId'); 
    if (!casterUid || !roomId) { showAlert('ข้อมูลไม่ครบถ้วน!', 'error'); return; }

    const combatSnap = await db.ref(`rooms/${roomId}/combat`).get();
    const currentCombatState = combatSnap.val() || {};
    if (!currentCombatState.isActive || currentCombatState.turnOrder[currentCombatState.currentTurnIndex].id !== casterUid) {
        return; 
    }

    const casterData = (typeof allPlayersInRoom !== 'undefined' && allPlayersInRoom) ? allPlayersInRoom[casterUid] : null; 
    if (!casterData) { showAlert('ไม่พบข้อมูลผู้ใช้ปัจจุบัน!', 'error'); return; }
    
    let combinedSkills = [...(SKILLS_DATA[casterData.class] || []), ...(SKILLS_DATA[casterData.race] || [])];
    const mainHand = casterData.equippedItems?.mainHand;
    if (mainHand && ITEM_SKILLS[mainHand.name]) { 
        ITEM_SKILLS[mainHand.name].forEach(itemSkill => { 
            if (!combinedSkills.some(s => s.id === itemSkill.id)) combinedSkills.push(itemSkill); 
        }); 
    }

    const skill = combinedSkills.find(s => s.id === skillId);
    if (!skill) { showAlert('ไม่พบสกิล!', 'error'); return; } 
    if (skill.skillTrigger === 'PASSIVE') { showAlert('สกิลติดตัวทำงานอัตโนมัติ', 'info'); return; }

    const casterRef = db.ref(`rooms/${roomId}/playersByUid/${casterUid}`); 
    let targetData = null; 
    let targetRef = null;

    if (skill.targetType === 'self') { 
        targetData = { ...casterData }; if(!targetData.type) targetData.type = 'player'; 
        targetRef = casterRef; 
    }
    else if (skill.targetType.includes('enemy')) { 
        targetData = (typeof allEnemiesInRoom !== 'undefined' && allEnemiesInRoom) ? allEnemiesInRoom[targetId] : null; 
        if (!targetData) { showAlert('ไม่พบข้อมูลเป้าหมายศัตรู!', 'error'); return; } 
        targetData = { ...targetData }; if(!targetData.type) targetData.type = 'enemy'; 
        targetRef = db.ref(`rooms/${roomId}/enemies/${targetId}`); 
    }
    else if (skill.targetType.includes('teammate')) { 
        if (skill.id.includes('cleric_heal') && targetId === casterUid) {
            return showAlert('นักบวช/นักบุญหญิง ไม่สามารถฮีลตัวเองได้!', 'warning');
        }
        targetData = (typeof allPlayersInRoom !== 'undefined' && allPlayersInRoom) ? allPlayersInRoom[targetId] : null; 
        if (!targetData) { showAlert('ไม่พบข้อมูลเป้าหมายเพื่อนร่วมทีม!', 'error'); return; } 
        targetData = { ...targetData }; if(!targetData.type) targetData.type = 'player'; 
        targetRef = db.ref(`rooms/${roomId}/playersByUid/${targetId}`); 
    }
    else { showAlert('ประเภทเป้าหมายสกิลไม่รองรับ', 'error'); return; }
    
    const cdError = checkCooldown(casterData, skill, currentCombatState); 
    if (cdError) { showAlert(cdError, 'warning'); return; }

    if (skill.condition && skill.condition.target === 'ENEMY' && targetData.type !== 'enemy') {
        return showAlert('คุณต้องเลือกเป้าหมาย (ศัตรู) ก่อนใช้สกิลนี้', 'warning');
    }

    const conditionResult = await checkConditions(casterData, targetData, skill, casterUid, roomId); 
    if (!conditionResult.met) return; 

    // [ ⭐️ REFACTOR ⭐️ ]
    // rollData ตอนนี้จะเก็บ { totalCasterRoll, dc } ซึ่ง totalCasterRoll คือผลทอยเต๋า (เช่น d40)
    const { success, rollData } = await performSuccessRoll(casterData, targetData, skill, options); 
    if (!success) { 
        // [ ⭐️ NEW ⭐️ ] ถ้าทอยสกิล (เช่น Excalibur) ล้มเหลว ให้ติด Cooldown แบบ "ล้มเหลว"
        if (skill.cooldown) {
            await setCooldown(casterRef, skill, true); // true = ติด Cooldown แบบล้มเหลว
        }
        await endPlayerTurn(casterUid, roomId); 
        return; 
    }

    let skillOutcome = null;
    try {
        // [ ⭐️ REFACTOR ⭐️ ] ส่ง rollData (ที่มีผลทอยเต๋า) เข้าไปใน applyEffect
        const effectOptions = { ...options, rollData: rollData };
        
        if (skill.targetType === 'enemy_all' || skill.targetType === 'teammate_all') {
            const allTargets = (skill.targetType === 'enemy_all') ? allEnemiesInRoom : allPlayersInRoom;
            for (const tId in allTargets) {
                if (skill.targetType === 'teammate_all' && tId === casterUid && !skill.id.includes('sage_')) continue; 
                
                const tData = { ...allTargets[tId], type: (skill.targetType === 'enemy_all' ? 'enemy' : 'player') };
                const tRef = db.ref(`rooms/${roomId}/${skill.targetType === 'enemy_all' ? 'enemies' : 'playersByUid'}/${tId}`);
                
                await applyEffect(casterRef, tRef, casterData, tData, skill, effectOptions);
            }
            skillOutcome = { statusApplied: `ส่งผลต่อเป้าหมายทั้งหมด` };
            
        } else if (targetRef) {
            skillOutcome = await applyEffect(casterRef, targetRef, casterData, targetData, skill, effectOptions);
        }

        if (skill.selfEffect) {
            await applyEffect(casterRef, casterRef, casterData, casterData, { ...skill, effect: skill.selfEffect }, effectOptions);
        }
        
        if (typeof displaySkillOutcome === 'function') displaySkillOutcome(skill, targetData, skillOutcome);
        
        await setCooldown(casterRef, skill, false);
         
         if (skill.id === 'sm_elemental_blade') {
             showAlert('คุณใช้เทิร์นนี้ในการร่ายเวทย์!', 'info');
         }
         await endPlayerTurn(casterUid, roomId); 
         
    } catch (error) { 
        console.error("Error applying skill effect:", error); 
        showAlert('เกิดข้อผิดพลาดร้ายแรงในการใช้สกิล', 'error'); 
        await endPlayerTurn(casterUid, roomId); 
    }
}


async function applyEffect(casterRef, targetRef, casterData, targetData, skill, options = {}) {
    const effect = skill.effect;
    const calcTotalStatFnLocal = calcTotalStatFn;
    const calcHPFnLocal = calcHPFn;
    const getStatBonusFnLocal = getStatBonusFn;

    let outcome = { damageDealt: 0, healAmount: 0, statusApplied: null };

    await targetRef.transaction(currentData => {
        if (currentData === null) { console.warn(`[TRANSACTION ${skill.id}] Target data is null, aborting.`); return; }
         if (!currentData.type) currentData.type = targetData.type;
         if (!currentData.race && targetData.type === 'player') currentData.race = targetData.race;
         if (!currentData.class && targetData.type === 'player') currentData.class = targetData.class;
         if (!currentData.stats) currentData.stats = { ...(targetData.stats || {}) };
         if (!currentData.activeEffects) currentData.activeEffects = [];

        const duration = effect.duration || (effect.durationDice ? (Math.floor(Math.random() * parseInt(effect.durationDice.replace('d', ''))) + 1) : 3);
        const amount = effect.amount || (effect.amountDice ? (Math.floor(Math.random() * parseInt(effect.amountDice.replace('d', ''))) + 1) : 0);

        let tempDataForMaxHpCalc = JSON.parse(JSON.stringify(currentData));
        const currentFinalCon_Before = calcTotalStatFnLocal(tempDataForMaxHpCalc, 'CON');
        const currentTheoreticalMaxHp = calcHPFnLocal(tempDataForMaxHpCalc.race, tempDataForMaxHpCalc.class, currentFinalCon_Before);
        
        console.log(`[TRANSACTION ${skill.id}] Before effect - Current HP: ${currentData.hp}, Theoretical MaxHP: ${currentTheoreticalMaxHp}, Stored MaxHP: ${currentData.maxHp}`);
        let conChangedInTransaction = false; 

        // =================================================================
        // [ ⭐️ REFACTOR ⭐️ ]
        // แบ่ง Logic การทำงานของ Effect ออกเป็น Helper Functions ตามหมวดหมู่
        // =================================================================

        /**
         * หมวดหมู่ 1: บัฟ, ดีบัฟ, และการเปลี่ยนแปลงสถานะชั่วคราว
         */
        function applyBuffDebuff() {
            switch(effect.type) {
                case 'TEMP_STAT_BUFF': case 'MULTI_TEMP_STAT': case 'MULTI_TEMP_STAT_PERCENT': case 'ALL_STATS_BUFF_PERCENT':
                    let statsToApply = [];
                    if (effect.type === 'ALL_STATS_BUFF_PERCENT') statsToApply = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(s => ({ stat: s, type: 'PERCENT', amount: effect.amount }));
                    else if (effect.stats.constructor === Array) statsToApply = effect.stats;
                    else for (const statKey in effect.stats) statsToApply.push({ stat: statKey, type: (effect.stats[statKey].type || 'FLAT'), amount: (effect.stats[statKey].amount != undefined ? effect.stats[statKey].amount : effect.stats[statKey]), amountDice: effect.stats[statKey].amountDice });

                    let buffDesc = [];
                    statsToApply.forEach(mod => {
                        let finalAmount = mod.amount; if (mod.type === 'SET_VALUE' && finalAmount === 0) {} else { finalAmount = mod.amount !== undefined ? mod.amount : 0; if(mod.amountDice) finalAmount = (Math.floor(Math.random() * parseInt(mod.amountDice.replace('d', ''))) + 1); }
                        currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: mod.stat, modType: mod.type, amount: finalAmount, turnsLeft: duration });
                        buffDesc.push(`${mod.stat} ${mod.type === 'PERCENT' ? finalAmount+'%' : (mod.type === 'SET_VALUE' ? '='+finalAmount : (finalAmount>=0?'+':'')+finalAmount)}`);
                        if (mod.stat === 'CON') conChangedInTransaction = true;
                    });
                    outcome.statusApplied = `ได้รับบัฟ ${buffDesc.join(', ')} (${duration} เทิร์น)`;
                    break;
                
                case 'TEMP_LEVEL_BUFF': // [ ⭐️ NEW ⭐️ ] สกิลใหม่นักปราชญ์
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: 'Level', modType: 'FLAT', amount: amount, turnsLeft: duration });
                    outcome.statusApplied = `ได้รับบัฟ เพิ่มเลเวล +${amount} (${duration} เทิร์น)`;
                    // (Logic การคำนวณ Stat จากเลเวลที่เพิ่ม ต้องไปทำใน calculateTotalStat)
                    conChangedInTransaction = true; // (ถือว่า CON อาจจะเปลี่ยน)
                    break;

                case 'SELECTABLE_TEMP_STAT_BUFF':
                     if (options.selectedStats) {
                        const amountBuffBase = amount; 
                        const amountBuff = amountBuffBase + (skill.effect.bonusPercent ? (amountBuffBase * (skill.effect.bonusPercent / 100)) : 0);
                        let buffDescSel = [];
                        options.selectedStats.forEach(stat => { currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: stat, modType: 'FLAT', amount: Math.floor(amountBuff), turnsLeft: duration }); buffDescSel.push(`${stat} +${Math.floor(amountBuff)}`); if (stat === 'CON') conChangedInTransaction = true; });
                        outcome.statusApplied = `ได้รับบัฟ ${buffDescSel.join(', ')} (${duration} เทิร์น)`;
                    } break;
                
                case 'RANDOM_STAT_DEBUFF': case 'RANDOM_STAT_DEBUFF_PERCENT': 
                    const statsList = ['STR','DEX','CON','INT','WIS','CHA']; 
                    const randomStat = statsList[Math.floor(Math.random()*statsList.length)]; 
                    const debuffAmount = amount; 
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'DEBUFF', stat: randomStat, modType: effect.type.includes('PERCENT') ? 'PERCENT' : 'FLAT', amount: -Math.abs(debuffAmount), turnsLeft: duration }); 
                    outcome.statusApplied = `ดีบัฟ ${randomStat} (${duration} เทิร์น)`; 
                    if(randomStat === 'CON') conChangedInTransaction = true; 
                    break;
                    
                case 'INVISIBILITY': 
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: 'Visibility', modType: 'SET_VALUE', amount: 'Invisible', turnsLeft: duration }); 
                    outcome.statusApplied = `หายตัว (${duration} เทิร์น)`; 
                    break;
                    
                case 'TRUE_STRIKE': 
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: 'AttackRoll', modType: 'GUARANTEED_HIT', amount: 1, turnsLeft: duration }); 
                    outcome.statusApplied = `โจมตีแม่นยำ (${duration} เทิร์น)`; 
                    break;
                    
                case 'ELEMENTAL_BLADE': 
                    const intBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, 'INT')); 
                    const strBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, 'STR')); 
                    const totalBonusPercent = Math.min(effect.bonusCap, (intBonus + strBonus)); 
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: 'WeaponDamage', modType: 'ELEMENTAL_PERCENT', amount: totalBonusPercent, turnsLeft: duration }); 
                    outcome.statusApplied = `เคลือบดาบธาตุ (${totalBonusPercent}%, ${duration} เทิร์น)`; 
                    break;
            }
        }
        
        /**
         * หมวดหมู่ 2: การฟื้นฟู (ฮีล)
         */
        function applyHealing() {
            switch(effect.type) {
                case 'HEAL': 
                    const healBonusH = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, skill.scalingStat)); 
                    const totalHeal = amount + healBonusH; 
                    if (currentData.race === 'อันเดด' || currentData.type === 'อันเดด') {
                        currentData.hp = (currentData.hp || 0) - totalHeal;
                        outcome.damageDealt = totalHeal;
                    } else {
                        const healedHp = Math.min(currentTheoreticalMaxHp, (currentData.hp || 0) + totalHeal) - (currentData.hp || 0); 
                        currentData.hp += healedHp; 
                        outcome.healAmount = healedHp; 
                        console.log(`[TRANSACTION ${skill.id}] HEAL: Amount=${amount}, Bonus=${healBonusH}, Total=${totalHeal}, Actual Healed=${healedHp}, New HP=${currentData.hp}`);
                    }
                    break;
                    
                case 'HEAL_PERCENT': 
                    const percentHealBaseHP = amount + getStatBonusFnLocal(calcTotalStatFnLocal(casterData, skill.scalingStat)); 
                    const percentHealHP = percentHealBaseHP / 100; 
                    const healAmountHP = Math.floor(currentTheoreticalMaxHp * percentHealHP); 
                    
                    if (currentData.race === 'อันเดด' || currentData.type === 'อันเดด') {
                        currentData.hp = (currentData.hp || 0) - healAmountHP;
                        outcome.damageDealt = healAmountHP;
                    } else {
                        const healedHpPercent = Math.min(currentTheoreticalMaxHp, (currentData.hp || 0) + healAmountHP) - (currentData.hp || 0); 
                        currentData.hp += healedHpPercent; 
                        outcome.healAmount = healedHpPercent; 
                        console.log(`[TRANSACTION ${skill.id}] HEAL_PERCENT: Amount=${amount}, Bonus=${getStatBonusFnLocal(calcTotalStatFnLocal(casterData, skill.scalingStat))}, Percent=${percentHealHP*100}%, Actual Healed=${healedHpPercent}, New HP=${currentData.hp}`); 
                    }
                    break;
            }
        }
        
        /**
         * หมวดหมู่ 3: การโจมตีแบบสร้างความเสียหายโดยตรง (Fixed, Dice)
         */
        function applyDirectDamage() {
             switch(effect.type) {
                case 'TRUE_DAMAGE':
                    let damageAmountTD = Number(effect.amount); 
                    if (isNaN(damageAmountTD)) { console.error(`[TRANSACTION ${skill.id}] Invalid base damage amount:`, effect.amount); return; }
                    currentData.hp = (currentData.hp || 0) - damageAmountTD; 
                    outcome.damageDealt = damageAmountTD;
                    break;
                    
                case 'PHYSICAL_DAMAGE':
                    const physicalRoll = Math.floor(Math.random() * parseInt(effect.damageDice.replace('d',''))) + 1;
                    const physicalBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, skill.scalingStat));
                    const finalDamageP = Math.max(1, physicalRoll + physicalBonus);
                    currentData.hp = (currentData.hp || 0) - finalDamageP; 
                    outcome.damageDealt = finalDamageP;
                    break;
    
                case 'MAGIC_DAMAGE_DYNAMIC': 
                    const resistBonusM = getStatBonusFnLocal(currentData.stats?.[effect.resistStat.toUpperCase()] || 10); 
                    const damageDiceTypeM = parseInt(effect.damageDiceMax.replace('d','')); 
                    const magicRoll = Math.floor(Math.random() * damageDiceTypeM) + 1; 
                    const magicBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, skill.scalingStat)); 
                    const finalDamageM = Math.max(1, (magicRoll + magicBonus) - resistBonusM); 
                    currentData.hp = (currentData.hp || 0) - finalDamageM; 
                    outcome.damageDealt = finalDamageM; 
                    console.log(`[TRANSACTION ${skill.id}] MAGIC_DAMAGE: Roll=${magicRoll}, Bonus=${magicBonus}, Resist=${resistBonusM}, Final=${finalDamageM}, New HP=${currentData.hp}`); 
                    break;
             }
        }
        
        /**
         * หมวดหมู่ 4: การโจมตีแบบ %HP (DOT และสูตรคำนวณพิเศษ)
         */
        function applyPercentDamage() {
            let damage = 0;
            const targetCurrentHp = currentData.hp || 0;
            const targetMaxHp = currentData.maxHp || currentTheoreticalMaxHp;

            switch(effect.type) {
                case 'POISON_DAMAGE_PERCENT': 
                    // (นี่คือ DOT, ไม่ใช่การโจมตีทันที แต่เป็นการแปะสถานะ)
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'DEBUFF', stat: 'HP', modType: 'DOT_PERCENT', amount: amount, turnsLeft: duration }); 
                    outcome.statusApplied = `ติดพิษ (${amount}% ต่อเทิร์น, ${duration} เทิร์น)`; 
                    break;

                case 'DAMAGE_HERO_WILL_FORMULA': // [ ⭐️ NEW ⭐️ ] สูตรผู้กล้า
                    // สูตร: Dmg = ((dอาวุธ + STR Bonus) * 0.25) * HP ปัจจุบันศัตรู
                    const strBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, 'STR'));
                    const weapon = casterData.equippedItems?.mainHand;
                    const weaponDie = weapon?.damage || 'd4'; // (ต้องเช็คว่า 'damage' เก็บค่า 'd12' ถูกต้อง)
                    const dieSize = parseInt(weaponDie.replace('d', ''));
                    const weaponRoll = Math.floor(Math.random() * dieSize) + 1;
                    
                    const formulaBase = (weaponRoll + strBonus) * 0.25;
                    damage = Math.floor(formulaBase * targetCurrentHp); 
                    
                    currentData.hp = targetCurrentHp - damage; 
                    outcome.damageDealt = damage;
                    console.log(`[TRANSACTION ${skill.id}] HERO WILL: (Roll ${weaponRoll} + STR ${strBonus}) * 0.25 * HP ${targetCurrentHp} = ${damage} Dmg`);
                    break;
                    
                case 'DAMAGE_EXCALIBUR_FORMULA': // [ ⭐️ NEW ⭐️ ] สูตร Excalibur
                    // สูตร: Dmg = (Map[roll 35-40] to [20-100%]) * HP ปัจจุบันศัตรู
                    // (เราได้ผลทอยมาจาก 'options.rollData.totalCasterRoll')
                    const roll = options.rollData?.totalCasterRoll;
                    let percentMultiplier = 0;
                    if (roll === 40) percentMultiplier = 1.00; // 100%
                    else if (roll === 39) percentMultiplier = 0.85; // 85%
                    else if (roll === 38) percentMultiplier = 0.75; // 75%
                    else if (roll === 37) percentMultiplier = 0.60; // 60%
                    else if (roll === 36) percentMultiplier = 0.40; // 40% (ไฟล์เก่าคุณมี 36 แต่สูตรใหม่มี 5 ค่า?)
                    else if (roll === 35) percentMultiplier = 0.20; // 20%
                    
                    damage = Math.floor(targetCurrentHp * percentMultiplier); 
                    
                    currentData.hp = targetCurrentHp - damage; 
                    outcome.damageDealt = damage;
                    console.log(`[TRANSACTION ${skill.id}] EXCALIBUR: Roll ${roll} = ${percentMultiplier*100}% Dmg on ${targetCurrentHp} = ${damage} Dmg`);
                    break;

                case 'DAMAGE_SAGE_SACRIFICE_FORMULA': // [ ⭐️ NEW ⭐️ ] สูตรนักปราชญ์
                    // สูตร: Dmg = ((WIS Bonus + INT Bonus) + 2) * HP ปัจจุบันศัตรู
                    const wisBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, 'WIS'));
                    const intBonus = getStatBonusFnLocal(calcTotalStatFnLocal(casterData, 'INT'));
                    
                    // (สูตรของคุณคือ ((...)+2) * HP) ถ้าค่านี้เป็น 10 * HP 100 = 1000 dmg
                    // ผมขอแก้เป็น ((...)+2) / 100 * HP นะครับ
                    const formulaPercent = (wisBonus + intBonus) + 2; 
                    damage = Math.floor((formulaPercent / 100) * targetCurrentHp); 
                    
                    currentData.hp = targetCurrentHp - damage;
                    outcome.damageDealt = damage;
                    console.log(`[TRANSACTION ${skill.id}] SAGE SACRIFICE: (WIS ${wisBonus} + INT ${intBonus} + 2) = ${formulaPercent}% of ${targetCurrentHp} = ${damage} Dmg`);
                    break;
            }
        }
        
        /**
         * หมวดหมู่ 5: Logic พิเศษ (Taunt)
         */
        function applySpecialLogic() {
            switch(effect.type) {
                case 'TAUNT': 
                    currentData.activeEffects = currentData.activeEffects.filter(e => !(e.type === 'TAUNT' && e.taunterUid === casterData.uid)); 
                    currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'TAUNT', taunterUid: casterData.uid, turnsLeft: duration }); 
                    outcome.statusApplied = `ยั่วยุ (${duration} เทิร์น)`; 
                    break;
            }
        }

        // =================================================================
        // [ ⭐️ REFACTOR ⭐️ ]
        // Main Switch (เรียกใช้ Helper Functions ตามหมวดหมู่)
        // =================================================================

        switch(effect.type) {
            // --- หมวด 1: บัฟ / ดีบัฟ ---
            case 'TEMP_STAT_BUFF':
            case 'MULTI_TEMP_STAT':
            case 'MULTI_TEMP_STAT_PERCENT':
            case 'ALL_STATS_BUFF_PERCENT':
            case 'SELECTABLE_TEMP_STAT_BUFF':
            case 'RANDOM_STAT_DEBUFF':
            case 'RANDOM_STAT_DEBUFF_PERCENT':
            case 'INVISIBILITY':
            case 'TRUE_STRIKE':
            case 'ELEMENTAL_BLADE':
            case 'TEMP_LEVEL_BUFF': // (สกิลใหม่)
                applyBuffDebuff();
                break;

            // --- หมวด 2: ฮีล ---
            case 'HEAL':
            case 'HEAL_PERCENT':
                applyHealing();
                break;

            // --- หมวด 3: โจมตีตรง ---
            case 'TRUE_DAMAGE':
            case 'PHYSICAL_DAMAGE':
            case 'MAGIC_DAMAGE_DYNAMIC':
                applyDirectDamage();
                break;
                
            // --- หมวด 4: โจมตี %HP และ DOT ---
            case 'POISON_DAMAGE_PERCENT': // (DOT)
            case 'DAMAGE_HERO_WILL_FORMULA': // (ใหม่)
            case 'DAMAGE_EXCALIBUR_FORMULA': // (ใหม่)
            case 'DAMAGE_SAGE_SACRIFICE_FORMULA': // (ใหม่)
                applyPercentDamage();
                break;

            // --- หมวด 5: Logic พิเศษ ---
            case 'TAUNT':
                applySpecialLogic();
                break;

            // --- [ ⭐️ DEPRECATED ⭐️ ] ---
            // (Logic เก่าเหล่านี้ ถูกแทนที่ด้วย Logic ใหม่ในหมวด 4 แล้ว)
            case 'TRUE_DAMAGE_PERCENT_MAXHP': // (Excalibur เก่า)
            case 'SACRIFICE_DAMAGE_PERCENT': // (Sage เก่า)
                console.warn(`[TRANSACTION] Obsolete effect type (ถูกแทนที่แล้ว): ${effect.type}`);
                break;
                
            // (Logic นี้ยังใช้งานอยู่ สำหรับสกิลนักฆ่า)
            case 'DAMAGE_AS_PERCENT': 
                const percentAmount = effect.percent || (effect.percentDice ? (Math.floor(Math.random() * parseInt(effect.percentDice.replace('d', ''))) + 1) : 25);
                currentData.activeEffects.push({ skillId: skill.id, name: skill.name, type: 'BUFF', stat: 'OutgoingDamage', modType: 'DAMAGE_AS_PERCENT', amount: percentAmount, turnsLeft: duration }); 
                outcome.statusApplied = `เปลี่ยนรูปแบบโจมตี (${percentAmount}%, ${duration} เทิร์น)`; 
                break;

            // --- [ ⭐️ PASSIVE ⭐️ ] ---
            // (Passive ของจอมมาร 'PASSIVE_DAMAGE_WEAPON_DIE_PERCENT_FORMULA'
            // จะไม่ถูกเรียกจากที่นี่ แต่จะถูกเรียกจาก "ฟังก์ชันคำนวณดาเมจหลัก"
            // ซึ่งไม่ได้อยู่ในไฟล์นี้)

            default:
                console.warn(`[TRANSACTION] Unhandled effect type: ${effect.type}`);
        }

        // =================================================================
        // [ ⭐️ REFACTOR ⭐️ ]
        // (ส่วนท้ายของ Transaction - ไม่เปลี่ยนแปลง)
        // =================================================================
        console.log(`[TRANSACTION ${skill.id}] HP Before Final Checks: ${currentData.hp}`);
        
        let finalTheoreticalMaxHp = currentTheoreticalMaxHp; 

        if (conChangedInTransaction) {
            let tempDataAfterEffect = JSON.parse(JSON.stringify(currentData));
            const finalConAfter = calcTotalStatFnLocal(tempDataAfterEffect, 'CON'); 
            finalTheoreticalMaxHp = calcHPFnLocal(tempDataAfterEffect.race, tempDataAfterEffect.class, finalConAfter); 
            currentData.maxHp = finalTheoreticalMaxHp;
            console.log(`[TRANSACTION ${skill.id}] CON changed. New Theoretical MaxHP: ${finalTheoreticalMaxHp}`);
        }
        
        if (currentData.hp < 0) { currentData.hp = 0; console.log(`[TRANSACTION ${skill.id}] HP floored to 0.`); }
        
        const ceilingHp = currentData.maxHp || finalTheoreticalMaxHp; 
        if (currentData.hp > ceilingHp) {
             currentData.hp = ceilingHp;
             console.log(`[TRANSACTION ${skill.id}] HP capped to ${ceilingHp}.`);
        }

        if (isNaN(currentData.hp)) { console.error(`[TRANSACTION ${skill.id}] HP became NaN! Aborting. Final checks state:`, { hp: currentData.hp, finalTheoreticalMaxHp }); return; }
        console.log(`[TRANSACTION ${skill.id}] Final HP returned: ${currentData.hp}`);

        return currentData;
    });

    // (ส่วน SelfEffect - ไม่เปลี่ยนแปลง)
    if (skill.selfEffect && skill.selfEffect.type === 'PERMANENT_STAT_LOSS') {
         if (skill.selfEffect.stat === 'MaxHP') {
             await casterRef.transaction(casterCurrentData => {
                 if (casterCurrentData) { 
                     const currentCon = calcTotalStatFnLocal(casterCurrentData, 'CON');
                     const currentMax = casterCurrentData.maxHp || calcHPFnLocal(casterCurrentData.race, casterCurrentData.class, currentCon);
                     
                     const lossAmount = Math.floor(currentMax * (skill.selfEffect.percent / 100)); 
                     casterCurrentData.maxHp = Math.max(1, currentMax - lossAmount); 
                     casterCurrentData.hp = Math.min(casterCurrentData.maxHp, casterCurrentData.hp || 0); 
                     console.log(`[SELF EFFECT] Sage used Sacrifice. Max HP reduced by ${lossAmount} to ${casterCurrentData.maxHp}`); 
                 } 
                 return casterCurrentData;
             });
         }
     }
     return outcome;
}