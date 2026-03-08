/**
 * DoudizhuTool - 斗地主游戏逻辑工具
 * Handles card dealing, validation, and game state management
 */

export interface Play {
  player: number;
  playerIdx: number;
  cards: string[];
  type: PlayType;
}

export type PlayType =
  | 'single'      // 单张
  | 'pair'        // 对子
  | 'triple'      // 三张
  | 'triple_single' // 三带一
  | 'triple_pair'   // 三带二
  | 'straight'    // 顺子 (5+)
  | 'pair_straight' // 连对 (3+ pairs)
  | 'plane'       // 飞机 (2+ triples)
  | 'bomb'        // 炸弹 (4张)
  | 'rocket';     // 王炸

export interface GameState {
  hands: [string[], string[], string[]];
  landlordIdx: number;
  currentPlayerIdx: number;
  lastPlay: Play | null;
  passCount: number;
  moveHistory: Array<{ player: number, action: string }>;
  playedCards: [string[], string[], string[]];
}

export class DoudizhuTool {
  // 卡牌权重映射 (用于比较大小)
  private static readonly CARD_VALUES: Record<string, number> = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'X': 16, 'D': 17  // X=小王, D=大王
  };

  /**
   * 创建54张牌
   */
  static createDeck(): string[] {
    const suits = ['3','4','5','6','7','8','9','T','J','Q','K','A','2'];
    const deck: string[] = [];

    // 每种牌4张
    for (const card of suits) {
      for (let i = 0; i < 4; i++) {
        deck.push(card);
      }
    }

    // 添加大小王
    deck.push('X', 'D');

    return deck;
  }

  /**
   * 洗牌并发牌
   */
  static dealCards(): { hands: [string[], string[], string[]], bottom: string[] } {
    const deck = this.createDeck();

    // Fisher-Yates 洗牌
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // 发牌: 每人17张, 底牌3张
    const hands: [string[], string[], string[]] = [
      deck.slice(0, 17).sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]),
      deck.slice(17, 34).sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]),
      deck.slice(34, 51).sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b])
    ];

    const bottom = deck.slice(51, 54).sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]);

    return { hands, bottom };
  }

  /**
   * 初始化游戏状态
   */
  static getInitialState(
    hands: [string[], string[], string[]],
    bottom: string[],
    landlordIdx: number
  ): GameState {
    // 地主拿底牌
    hands[landlordIdx].push(...bottom);
    hands[landlordIdx].sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]);

    return {
      hands,
      landlordIdx,
      currentPlayerIdx: landlordIdx,  // 地主先出
      lastPlay: null,
      passCount: 0,
      moveHistory: [],
      playedCards: [[], [], []]
    };
  }

  /**
   * 判断游戏是否结束
   */
  static isGameOver(state: GameState): { over: boolean, winner: 'landlord' | 'farmers' | null } {
    // 检查是否有人出完牌
    for (let i = 0; i < 3; i++) {
      if (state.hands[i].length === 0) {
        const winner = i === state.landlordIdx ? 'landlord' : 'farmers';
        return { over: true, winner };
      }
    }

    return { over: false, winner: null };
  }

  /**
   * 解析出牌类型
   */
  static parsePlayType(cards: string[]): PlayType | null {
    if (cards.length === 0) return null;

    const sorted = [...cards].sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]);
    const counts = this.getCardCounts(sorted);
    const uniqueCards = Object.keys(counts);

    // 王炸
    if (cards.length === 2 && sorted.includes('X') && sorted.includes('D')) {
      return 'rocket';
    }

    // 炸弹
    if (cards.length === 4 && uniqueCards.length === 1) {
      return 'bomb';
    }

    // 单张
    if (cards.length === 1) return 'single';

    // 对子
    if (cards.length === 2 && uniqueCards.length === 1) return 'pair';

    // 三张
    if (cards.length === 3 && uniqueCards.length === 1) return 'triple';

    // 三带一
    if (cards.length === 4 && uniqueCards.length === 2) {
      const hasTriple = Object.values(counts).includes(3);
      if (hasTriple) return 'triple_single';
    }

    // 三带二
    if (cards.length === 5 && uniqueCards.length === 2) {
      const hasTriple = Object.values(counts).includes(3);
      const hasPair = Object.values(counts).includes(2);
      if (hasTriple && hasPair) return 'triple_pair';
    }

    // 顺子 (5+张连续单牌, 不含2和王)
    if (cards.length >= 5 && uniqueCards.length === cards.length) {
      if (this.isStraight(sorted)) return 'straight';
    }

    // 连对 (3+对连续)
    if (cards.length >= 6 && cards.length % 2 === 0) {
      const allPairs = Object.values(counts).every(c => c === 2);
      if (allPairs && this.isStraight(uniqueCards)) return 'pair_straight';
    }

    // 飞机 (2+个三张连续)
    if (cards.length >= 6 && cards.length % 3 === 0) {
      const allTriples = Object.values(counts).every(c => c === 3);
      if (allTriples && this.isStraight(uniqueCards)) return 'plane';
    }

    return null;  // 非法牌型
  }

  /**
   * 验证出牌是否合法
   */
  static isValidPlay(cards: string[], lastPlay: Play | null): boolean {
    if (cards.length === 0) return true;  // pass总是合法

    const playType = this.parsePlayType(cards);
    if (!playType) return false;  // 非法牌型

    // 首次出牌
    if (!lastPlay) return true;

    // 炸弹和王炸可以打任何牌
    if (playType === 'bomb' || playType === 'rocket') return true;

    // 必须同类型
    if (playType !== lastPlay.type) return false;

    // 比较大小
    return this.canBeat({ player: -1, playerIdx: -1, cards, type: playType }, lastPlay);
  }

  /**
   * 判断play是否能压过lastPlay
   */
  static canBeat(play: Play, lastPlay: Play): boolean {
    // 王炸最大
    if (play.type === 'rocket') return true;
    if (lastPlay.type === 'rocket') return false;

    // 炸弹压非炸弹
    if (play.type === 'bomb' && lastPlay.type !== 'bomb') return true;
    if (lastPlay.type === 'bomb' && play.type !== 'bomb') return false;

    // 炸弹之间比较
    if (play.type === 'bomb' && lastPlay.type === 'bomb') {
      return this.CARD_VALUES[play.cards[0]] > this.CARD_VALUES[lastPlay.cards[0]];
    }

    // 同类型比较主牌
    if (play.type === lastPlay.type && play.cards.length === lastPlay.cards.length) {
      const playMain = this.getMainCard(play.cards, play.type);
      const lastMain = this.getMainCard(lastPlay.cards, lastPlay.type);
      return this.CARD_VALUES[playMain] > this.CARD_VALUES[lastMain];
    }

    return false;
  }

  /**
   * 获取所有合法出牌
   */
  static getLegalPlays(hand: string[], lastPlay: Play | null): string[][] {
    const legal: string[][] = [];

    // pass总是合法(除非是首次出牌)
    if (lastPlay) {
      legal.push([]);
    }

    // 生成所有可能的组合并验证
    const combinations = this.generateCombinations(hand);
    for (const combo of combinations) {
      if (this.isValidPlay(combo, lastPlay)) {
        legal.push(combo);
      }
    }

    return legal;
  }

  /**
   * 随机选择一个合法出牌
   */
  static pickRandomPlay(legalPlays: string[][]): string[] {
    if (legalPlays.length === 0) return [];

    // 优先出牌而非pass
    const nonPassPlays = legalPlays.filter(p => p.length > 0);
    if (nonPassPlays.length > 0) {
      return nonPassPlays[Math.floor(Math.random() * nonPassPlays.length)];
    }

    return [];
  }

  /**
   * 应用出牌到游戏状态
   */
  static applyPlay(state: GameState, cards: string[]): GameState {
    const newState = { ...state };
    const currentHand = [...newState.hands[newState.currentPlayerIdx]];
    const newPlayedCards: [string[], string[], string[]] = [
      [...newState.playedCards[0]],
      [...newState.playedCards[1]],
      [...newState.playedCards[2]]
    ];

    // 移除出的牌
    for (const card of cards) {
      const idx = currentHand.indexOf(card);
      if (idx !== -1) currentHand.splice(idx, 1);
    }

    newState.hands[newState.currentPlayerIdx] = currentHand;

    // 记录已出的牌
    if (cards.length > 0) {
      newPlayedCards[newState.currentPlayerIdx].push(...cards);
    }
    newState.playedCards = newPlayedCards;

    // 更新lastPlay
    if (cards.length > 0) {
      const playType = this.parsePlayType(cards);
      newState.lastPlay = {
        player: newState.currentPlayerIdx,
        playerIdx: newState.currentPlayerIdx,
        cards,
        type: playType!
      };
      newState.passCount = 0;
    } else {
      newState.passCount++;
    }

    // 如果连续2次pass, 清空lastPlay (新一轮)
    if (newState.passCount >= 2) {
      newState.lastPlay = null;
      newState.passCount = 0;
    }

    // 记录历史
    newState.moveHistory.push({
      player: newState.currentPlayerIdx,
      action: cards.length > 0 ? cards.join(',') : 'pass'
    });

    // 下一个玩家
    newState.currentPlayerIdx = (newState.currentPlayerIdx + 1) % 3;

    return newState;
  }

  // ========== 辅助方法 ==========

  private static getCardCounts(cards: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      counts[card] = (counts[card] || 0) + 1;
    }
    return counts;
  }

  private static isStraight(cards: string[]): boolean {
    if (cards.length < 5) return false;

    // 不能包含2和王
    if (cards.some(c => ['2', 'X', 'D'].includes(c))) return false;

    const values = cards.map(c => this.CARD_VALUES[c]).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) return false;
    }
    return true;
  }

  private static getMainCard(cards: string[], type: PlayType): string {
    if (type === 'triple_single' || type === 'triple_pair') {
      // 找出现3次的牌
      const counts = this.getCardCounts(cards);
      for (const [card, count] of Object.entries(counts)) {
        if (count === 3) return card;
      }
    }
    return cards[0];
  }

  private static generateCombinations(hand: string[]): string[][] {
    const result: string[][] = [];
    const n = hand.length;

    // 生成所有子集 (限制最多15张避免爆炸)
    const maxSize = Math.min(n, 15);
    for (let size = 1; size <= maxSize; size++) {
      this.combinationsHelper(hand, size, 0, [], result);
    }

    return result;
  }

  private static combinationsHelper(
    arr: string[],
    size: number,
    start: number,
    current: string[],
    result: string[][]
  ): void {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      this.combinationsHelper(arr, size, i + 1, current, result);
      current.pop();
    }
  }
}
