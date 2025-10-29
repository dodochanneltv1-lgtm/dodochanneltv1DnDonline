// Javascript/skills-data.js - REBUILT VERSION (Oct 29, 2025)
// สร้างฐานข้อมูลสกิลใหม่ทั้งหมดตามกฎที่ผู้ใช้กำหนด (อัปเดต Concept B + Ranger Fix)

/**
 * Helper function to calculate stat bonus.
 * Ensures input is treated as a number.
 */
function getStatBonus(statValue) {
    const value = Number(statValue);
    const validValue = isNaN(value) ? 10 : value; // Default to 10 if input is not a number
    return Math.floor((validValue - 10) / 2);
}

/**
 * Main skill database for classes and races.
 */
const SKILLS_DATA = {
    // --- Class Skills (เขียนใหม่ตามกฎ) ---
    'บาร์บาเรียน': [
        { 
            id: 'barbarian_berserk', 
            name: 'คลั่ง (Berserk)', 
            description: 'บัฟกายภาพ 10%, ลดจิตใจ = 0 (d6 เทิร์น). 1 ครั้ง/การต่อสู้.', 
            targetType: 'self', 
            skillType: 'BUFF_DEBUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_COMBAT', uses: 1 }, 
            effect: { 
                type: 'MULTI_TEMP_STAT', 
                durationDice: 'd6', 
                stats: [ 
                    { stat: 'STR', type: 'PERCENT', amount: 10 }, 
                    { stat: 'DEX', type: 'PERCENT', amount: 10 }, 
                    { stat: 'CON', type: 'PERCENT', amount: 10 }, 
                    { stat: 'INT', type: 'SET_VALUE', amount: 0 }, 
                    { stat: 'WIS', type: 'SET_VALUE', amount: 0 }, 
                    { stat: 'CHA', type: 'SET_VALUE', amount: 0 } 
                ] 
            } 
        }
    ],
    'แทงค์': [
        { 
            id: 'tank_taunt', 
            name: 'ท้าทายยั่วยุ', 
            description: 'ยั่วยุศัตรูทั้งหมด (d4 เทิร์น), บัฟ CON 5%. CD 5 เทิร์น.', 
            targetType: 'enemy_all', 
            skillType: 'CONTROL', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'CON', 
            cooldown: { type: 'PER_TURN', turns: 5 }, 
            successRoll: { 
                dice: 'd20', 
                baseDC: 10, 
                resistStat: 'WIS' 
            }, 
            effect: { 
                type: 'TAUNT', 
                durationDice: 'd4' 
            },
            selfEffect: { 
                type: 'TEMP_STAT_BUFF', 
                stats: { 'CON': { type: 'PERCENT', amount: 5 } },
                durationDice: 'd4' 
            }
        }
    ],
    'นักรบ': [
        { 
            id: 'warrior_will', 
            name: 'เจตจำนงแห่งนักรบ', 
            description: 'เพิ่ม DEX, STR 5% (d4 เทิร์น). 1 ครั้ง/การต่อสู้.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_COMBAT', uses: 1 }, 
            effect: { 
                type: 'MULTI_TEMP_STAT', 
                durationDice: 'd4', 
                stats: [ 
                    { stat: 'STR', type: 'PERCENT', amount: 5 }, 
                    { stat: 'DEX', type: 'PERCENT', amount: 5 } 
                ] 
            } 
        }
    ],
    'นักดาบเวทย์': [
        {
            id: 'sm_elemental_blade',
            name: 'ดาบแห่งเวทย์ธาตุ',
            description: 'เคลือบดาบธาตุ (d4 เทิร์น), โบนัส 1%INT + 1%STR (สูงสุด 7%). CD 5 เทิร์น.',
            targetType: 'self',
            skillType: 'BUFF',
            skillTrigger: 'ACTIVE',
            scalingStat: 'INT', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            effect: {
                type: 'ELEMENTAL_BLADE', 
                durationDice: 'd4',
                bonusCap: 7 
            }
        }
    ],
    'อัศวิน': [
        { 
            id: 'knight_honor', 
            name: 'เกียรติยศแห่งอัศวิน', 
            description: 'เพิ่ม DEX 10%, STR 10%, CON 2% (d4 เทิร์น). 1 ครั้ง/การต่อสู้.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_COMBAT', uses: 1 }, 
            effect: { 
                type: 'MULTI_TEMP_STAT', 
                durationDice: 'd4', 
                stats: [ 
                    { stat: 'STR', type: 'PERCENT', amount: 10 }, 
                    { stat: 'DEX', type: 'PERCENT', amount: 10 },
                    { stat: 'CON', type: 'PERCENT', amount: 2 } 
                ] 
            } 
        }
    ],
    'อัศวินศักดิ์สิทธิ์': [
        { 
            id: 'hk_passive_aura', 
            name: 'ออร่าศักดิ์สิทธิ์ (ติดตัว)', 
            description: 'บัฟ INT, WIS, CON ทั้งทีม 3%.', 
            targetType: 'team', 
            skillType: 'BUFF', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'AURA_STAT_BUFF_PERCENT', 
                stats: [ 
                    { stat: 'INT', type: 'PERCENT', amount: 3 }, 
                    { stat: 'WIS', type: 'PERCENT', amount: 3 },
                    { stat: 'CON', type: 'PERCENT', amount: 3 }
                ] 
            } 
        },
        { 
            id: 'hk_honor', 
            name: 'เกียรติยศแห่งอัศวินศักดิ์สิทธิ์', 
            description: 'เพิ่ม DEX 15%, STR 15%, CON 5% (d4 เทิร์น). 1 ครั้ง/การต่อสู้.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_COMBAT', uses: 1 }, 
            effect: { 
                type: 'MULTI_TEMP_STAT', 
                durationDice: 'd4', 
                stats: [ 
                    { stat: 'STR', type: 'PERCENT', amount: 15 }, 
                    { stat: 'DEX', type: 'PERCENT', amount: 15 },
                    { stat: 'CON', type: 'PERCENT', amount: 5 } 
                ] 
            } 
        }
    ],
    'ผู้กล้า': [
        { 
            id: 'hero_passive_upgrade', 
            name: 'ศักยภาพผู้กล้า (ติดตัว)', 
            description: 'เพิ่มประสิทธิภาพสกิลเดิม 15-20%.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'PASSIVE_SKILL_ENHANCEMENT', 
                minPercent: 15,
                maxPercent: 20
            } 
        },
        {
            // === HERO CUSTOM FORMULA (HP%) ===
            id: 'hero_will_attack', // Changed ID
            name: 'เจตจำนงสังหาร (HP%)', // Changed Name
            description: 'โจมตี %HP (สูตร: ((dอาวุธ+STR) * 0.25) * HPปัจจุบัน). CD 8 เทิร์น.',
            targetType: 'enemy', // Changed Target
            skillType: 'DAMAGE', // Changed Type
            skillTrigger: 'ACTIVE',
            scalingStat: 'STR', // Formula uses STR
            cooldown: { type: 'PER_TURN', turns: 8 },
            effect: {
                type: 'DAMAGE_HERO_WILL_FORMULA', // <-- ป้ายกำกับใหม่
                // (Logic in actions.js: Dmg = (rollWeaponDie() + caster.STR_Bonus) * 0.25 * target.currentHP)
            }
            // === END UPDATE ===
        }
    ],
    'นักเวท': [
        { 
            id: 'mage_elemental_attack', 
            name: 'เวทมนตร์ธาตุ', 
            description: 'โจมตีธาตุ (d4-d12). เช็ค DEX (Hit), INT vs WIS (Dmg/Resist). CD 2 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DAMAGE', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'INT', 
            cooldown: { type: 'PER_TURN', turns: 2 }, 
            successRoll: { 
                dice: 'd20', 
                baseDC: 10, 
                resistStat: 'DEX' 
            }, 
            effect: { 
                type: 'MAGIC_DAMAGE_DYNAMIC', 
                resistStat: 'WIS', 
                damageDiceMin: 'd4', 
                damageDiceMax: 'd12'
            } 
        }
    ],
    'นักบวช': [
        { 
            id: 'cleric_heal', 
            name: 'ฟื้นฟู (Heal)', 
            description: 'ฮีลเพื่อน (d4+WIS). โจมตี Undead. CD 3 เทิร์น.', 
            targetType: 'teammate', 
            skillType: 'HEAL', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 3 },
            successRoll: { 
                dice: 'd20', 
                baseDC: 10, 
                resistStat: null 
            },
            effect: { 
                type: 'HEAL', 
                damageDice: 'd4' 
            } 
        },
        { 
            id: 'cleric_prayer', 
            name: 'ภาวนาแด่พระผู้เป็นเจ้า', 
            description: 'บัฟเพื่อน 1-3 คน, คนละ 1-3 ค่า (d6, d4 เทิร์น). DC เพิ่มตามจำนวน. CD 5 เทิร์น.', 
            targetType: 'teammate_multi', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { 
                dice: 'd20', 
                baseDC: 8, 
                dcPerChoice: 3 
            },
            effect: { 
                type: 'SELECTABLE_TEMP_STAT_BUFF', 
                maxTargets: 3, 
                maxChoicesPerTarget: 3, 
                amountDice: 'd6', 
                durationDice: 'd4' 
            } 
        },
        { 
            id: 'cleric_debuff', 
            name: 'บทลงโทษแด่ผู้ดูหมิ่น', 
            description: 'ดีบัฟศัตรู (d4 หน่วย, d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DEBUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { 
                dice: 'd20', 
                baseDC: 10, 
                resistStat: 'DEX' 
            },
            effect: { 
                type: 'RANDOM_STAT_DEBUFF', 
                amountDice: 'd4', 
                durationDice: 'd4' 
            } 
        }
    ],
    'นักบุญหญิง': [
        { 
            id: 'saint_heal', 
            name: 'ฟื้นฟู (นักบุญ)', 
            description: 'ฮีลเพื่อน (d8+WIS). CD 3 เทิร์น.', 
            targetType: 'teammate', 
            skillType: 'HEAL', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 3 },
            successRoll: { dice: 'd20', baseDC: 10, resistStat: null },
            effect: { type: 'HEAL', damageDice: 'd8' } 
        },
        { 
            id: 'saint_blessing', 
            name: 'การอวยพรจากนักบุญ', 
            description: 'บัฟเพื่อน 1-4 คน, คนละ 1-3 ค่า (d6+5%, d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'teammate_multi', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { dice: 'd20', baseDC: 8, dcPerChoice: 3 },
            effect: { 
                type: 'SELECTABLE_TEMP_STAT_BUFF',
                bonusPercent: 5, 
                maxTargets: 4, 
                maxChoicesPerTarget: 3, 
                amountDice: 'd6', 
                durationDice: 'd4' 
            } 
        },
        { 
            id: 'saint_debuff', 
            name: 'บทลงโทษแด่ผู้ดูหมิ่นนักบุญ', 
            description: 'ดีบัฟศัตรู (d8 หน่วย, d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DEBUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { dice: 'd20', baseDC: 10, resistStat: 'DEX' },
            effect: { 
                type: 'RANDOM_STAT_DEBUFF', 
                amountDice: 'd8', 
                durationDice: 'd4' 
            } 
        }
    ],
    'สตรีศักดิ์สิทธิ์': [
        { 
            id: 'holy_woman_heal', 
            name: 'ฟื้นฟู (ศักดิ์สิทธิ์)', 
            description: 'ฮีลเพื่อน (d12%+WIS). CD 3 เทิร์น.', 
            targetType: 'teammate', 
            skillType: 'HEAL', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 3 },
            successRoll: { dice: 'd20', baseDC: 10, resistStat: null },
            effect: { 
                type: 'HEAL_PERCENT', 
                damageDice: 'd12' 
            } 
        },
        { 
            id: 'holy_woman_blessing', 
            name: 'คำอวยพรจากสตรีศักดิ์สิทธิ์', 
            description: 'บัฟเพื่อนไม่จำกัด, คนละ 1-5 ค่า (d6+5%, d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'teammate_all', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { dice: 'd20', baseDC: 8, dcPerChoice: 2 }, 
            effect: { 
                type: 'SELECTABLE_TEMP_STAT_BUFF',
                bonusPercent: 5,
                maxTargets: 99, 
                maxChoicesPerTarget: 5, 
                amountDice: 'd6', 
                durationDice: 'd4' 
            } 
        },
        { 
            id: 'holy_woman_debuff', 
            name: 'บทลงโทษจากสตรีศักดิ์สิทธิ์', 
            description: 'ดีบัฟศัตรู (d12 %, d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DEBUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { dice: 'd20', baseDC: 10, resistStat: 'DEX' },
            effect: { 
                type: 'RANDOM_STAT_DEBUFF_PERCENT', 
                amountDice: 'd12', 
                durationDice: 'd4' 
            } 
        }
    ],
    'โจร': [
        { 
            id: 'rogue_stealth', 
            name: 'ไร้เงา (Stealth)', 
            description: 'หายตัว (d4 เทิร์น). เช็ค DEX vs DEX. CD 5 เทิร์น.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'DEX', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            successRoll: { 
                type: 'CONTESTED', 
                dice: 'd20', 
                resistStat: 'DEX' 
            },
            effect: { 
                type: 'INVISIBILITY', 
                durationDice: 'd4' 
            } 
        },
        { 
            id: 'rogue_passive_expert', 
            name: 'ผู้เชี่ยวชาญ (ติดตัว)', 
            description: 'ปลดล็อค/หากับดักง่ายขึ้น 50%.', 
            targetType: 'self', 
            skillType: 'UTILITY', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'SKILL_CHECK_BONUS', 
                skill: 'TRAPS_LOCKS', 
                bonusPercent: 50 
            } 
        }
    ],
    'นักฆ่า': [
        // ( kế thừaสกิลโจร )
        { 
            id: 'assassin_backstab', 
            name: 'แทงข้างหลัง', 
            description: 'โจมตี (d8+DEX). เช็ค DEX vs DEX. CD 4 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DAMAGE', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'DEX', 
            cooldown: { type: 'PER_TURN', turns: 4 },
            successRoll: { 
                type: 'CONTESTED', 
                dice: 'd20', 
                resistStat: 'DEX' 
            },
            effect: { 
                type: 'PHYSICAL_DAMAGE', 
                damageDice: 'd8' 
            } 
        },
        { 
            id: 'assassin_execute', 
            name: 'ปลิดชีพสังหาร', 
            description: 'เปลี่ยนความเสียหายเป็น d8% (d4 เทิร์น). CD 6 เทิร์น.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_TURN', turns: 6 },
            effect: { 
                type: 'DAMAGE_AS_PERCENT', 
                durationDice: 'd4',
                percentDice: 'd8' 
            } 
        }
    ],
    'เรนเจอร์': [
        { 
            id: 'ranger_silent_step', 
            name: 'ย่างก้าวเงียบงัน', 
            description: 'เพิ่ม DEX (d6%) (d4 เทิร์น). CD 5 เทิร์น.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            effect: { 
                type: 'TEMP_STAT_BUFF_PERCENT', 
                stats: [
                    { stat: 'DEX', type: 'PERCENT', amountDice: 'd6' }
                ], 
                durationDice: 'd4' 
            } 
        },
        { 
            // === RANGER FIX ===
            id: 'ranger_gods_hand', 
            name: 'หัตถ์พระเจ้า (เน้นความแม่นยำ)', 
            description: 'เพิ่ม DEX 50% ชั่วคราว (2 เทิร์น). (ต้อง DEX > ศัตรู 5). CD 5 เทิร์น.', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            condition: {
                type: 'STAT_GREATER_THAN', 
                stat: 'DEX',
                target: 'ENEMY', 
                amount: 5
            },
            effect: { 
                type: 'MULTI_TEMP_STAT', // <-- THE FIX (ทำให้ทำงานได้)
                duration: 2, 
                stats: [ 
                    { stat: 'DEX', type: 'PERCENT', amount: 50 } 
                ] 
            } 
            // === END FIX ===
        },
        { 
            id: 'ranger_poison_arrow', 
            name: 'ศรอาบยาพิษ', 
            description: 'เสียหายต่อเนื่อง (d4%) (d4 เทิร์น). CD 6 เทิร์น.', 
            targetType: 'enemy', 
            skillType: 'DAMAGE_OVER_TIME', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_TURN', turns: 6 },
            effect: { 
                type: 'POISON_DAMAGE_PERCENT', 
                damageDice: 'd4', 
                durationDice: 'd4' 
            } 
        }
    ],
    'พ่อค้า': [
        { 
            id: 'merchant_negotiator', 
            name: 'เจ้าแห่งการเจรจา (ติดตัว)', 
            description: 'เจรจาสำเร็จง่ายขึ้น 50%.', 
            targetType: 'self', 
            skillType: 'UTILITY', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'SKILL_CHECK_BONUS', 
                skill: 'NEGOTIATION', 
                bonusPercent: 50 
            } 
        }
    ],
    'นักปราชญ์': [
        { 
            id: 'sage_group_heal', 
            name: 'พรแห่งนักปราชญ์ (Group Heal)', 
            description: 'ฮีลทั้งทีม (d6%+WIS). CD 5 เทิร์น.', 
            targetType: 'teammate_all', 
            skillType: 'HEAL', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            cooldown: { type: 'PER_TURN', turns: 5 },
            effect: { 
                type: 'HEAL_PERCENT', 
                damageDice: 'd6' 
            } 
        },
        { 
            id: 'sage_group_buff', 
            name: 'บัฟจากนักปราชญ์', 
            description: 'บัฟทั้งทีม (สุ่ม Stat d8%, d4 เทิร์น).', 
            targetType: 'teammate_all', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            effect: { 
                type: 'RANDOM_STAT_BUFF_PERCENT', 
                amountDice: 'd8', 
                durationDice: 'd4' 
            } 
        },
        { 
            id: 'sage_group_debuff', 
            name: 'ดีบัฟแก่ผู้ขัดขวาง', 
            description: 'ดีบัฟศัตรูทั้งหมด (สุ่ม Stat d6%+WIS). เช็ค WIS. CD ?', 
            targetType: 'enemy_all', 
            skillType: 'DEBUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', 
            successRoll: { 
                dice: 'd20', 
                baseDC: 10, 
                resistStat: 'WIS' 
            },
            effect: { 
                type: 'RANDOM_STAT_DEBUFF_PERCENT', 
                amountDice: 'd6', 
                durationDice: 'd4' 
            } 
        },
        { 
            // === SAGE CUSTOM FORMULA ===
            id: 'sage_sacrifice_attack', 
            name: 'การจู่โจมแห่งนักปราชญ์', 
            description: 'โจมตี %HP (สูตร: ((WIS/2+INT/2)+2) * HPปัจจุบัน). 1ครั้ง/ต่อสู้. (เสีย 3% MaxHP ถาวร)', 
            targetType: 'enemy', 
            skillType: 'DAMAGE', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'INT', 
            cooldown: { type: 'PER_COMBAT', uses: 1 },
            effect: { 
                type: 'DAMAGE_SAGE_SACRIFICE_FORMULA', // <-- ป้ายกำกับใหม่
                // (Logic in actions.js: Dmg = ((caster.WIS_Bonus + caster.INT_Bonus) + 2) / 100 * target.currentHP)
            },
            selfEffect: {
                type: 'PERMANENT_STAT_LOSS',
                stat: 'MaxHP',
                percent: 3
            }
            // === END UPDATE ===
        },
        { 
            // === NEW SAGE SKILL ===
            id: 'sage_team_level_up', 
            name: 'ปลุกพลังร่วม', 
            description: 'เพิ่มเลเวลทั้งทีม (d4 เลเวล) (d8 เทิร์น). CD 12 เทิร์น.', 
            targetType: 'teammate_all', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            scalingStat: 'WIS', // อิงค่าสเตตัสของนักปราชญ์
            cooldown: { type: 'PER_TURN', turns: 12 },
            effect: { 
                type: 'TEMP_LEVEL_BUFF', 
                amountDice: 'd4', 
                durationDice: 'd8' 
            } 
            // === END NEW SKILL ===
        }
    ],
    'เจ้าเมือง': [
        { 
            id: 'lord_command', 
            name: 'คำสั่งจากเจ้าเมือง', 
            description: 'บัฟเพื่อนร่วมทีมทั้งหมด 10% (5 เทิร์น). CD 6 เทิร์น.', 
            targetType: 'teammate_all', 
            skillType: 'BUFF', 
            skillTrigger: 'ACTIVE', 
            cooldown: { type: 'PER_TURN', turns: 6 },
            effect: { 
                type: 'ALL_STATS_BUFF_PERCENT', 
                amount: 10, 
                duration: 5 
            } 
        }
    ],
    'จอมมาร': [
        { 
            id: 'demon_lord_aura', 
            name: 'ข่มขวัญ (ติดตัว)', 
            description: 'ลดสเตตัสศัตรูทั้งหมด 10%.', 
            targetType: 'enemy_all', 
            skillType: 'DEBUFF', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'AURA_STAT_DEBUFF_PERCENT', 
                amount: 10 
            } 
        },
        { 
            // === DEMON LORD CUSTOM FORMULA ===
            id: 'demon_lord_passive_attack', 
            name: 'จู่โจม % (ติดตัว)', 
            description: 'ทุกการโจมตีสร้างความเสียหาย % (สูตร: (dอาวุธ/100) * HPศัตรู).', 
            targetType: 'self', 
            skillType: 'BUFF', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'PASSIVE_DAMAGE_WEAPON_DIE_PERCENT_FORMULA', // <-- ป้ายกำกับใหม่
                // (Logic in actions.js: ExtraDmg = (weaponDieRoll / 100) * target.currentHP)
            } 
            // === END UPDATE ===
        }
    ],
    'เทพเจ้า': [
        { 
            id: 'god_dm_powers', 
            name: 'พลังแห่งพระเจ้า (ติดตัว)', 
            description: 'มีความสามารถเหมือน DM.', 
            targetType: 'any', 
            skillType: 'UTILITY', 
            skillTrigger: 'PASSIVE', 
            effect: { 
                type: 'DM_LIKE_POWERS' 
            } 
        }
    ]
};

/**
 * Item skill database. (ย้าย Excalibur มาที่นี่ตามคำสั่ง)
 */
const ITEM_SKILLS = {
    // === EXCALIBUR CUSTOM FORMULA ===
    'Excalibur': [{
        id: 'item_excalibur_strike',
        name: 'Excalibur Strike (% Max HP)',
        description: 'โจมตี %HP (ตามสูตรเฉพาะ). (ต้องทอย d40 >= 35). CD 5 การต่อสู้ (พลาด 3 เทิร์น).',
        targetType: 'enemy',
        skillType: 'DAMAGE',
        skillTrigger: 'ACTIVE',
        cooldown: { type: 'PER_TURN', turns: 3 }, 
        successCooldown: { type: 'PER_COMBAT', uses: 0.2 }, 
        successRoll: { // นี่คือการทอยเช็ค
            dice: 'd40', 
            baseDC: 35, // AC 35
            resistStat: null 
        },
        effect: {
            type: 'DAMAGE_EXCALIBUR_FORMULA', // <-- ป้ายกำกับใหม่
            // (Logic in actions.js: Check d40 roll (35-40) -> map to multiplier [0.2, 0.4, 0.6, 0.75, 0.85, 1.0] * target.currentHP)
        }
    }]
    // === END UPDATE ===
};