import { suona, sbloccaAudio, setPartitaConSuoni, isMuto, setMuto, NOMI_SUONI, _reset } from '../../services/soundService';

// A fake Web Audio: it counts the notes that are played
class FakeContext {
  static istanze = [];
  constructor() {
    this.currentTime = 0;
    this.state = 'suspended';
    this.destination = {};
    this.oscillatori = [];
    this.resume = vi.fn(() => {
      this.state = 'running';
      return Promise.resolve();
    });
    FakeContext.istanze.push(this);
  }
  createOscillator() {
    const o = { type: '', frequency: { value: 0, setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    this.oscillatori.push(o);
    return o;
  }
  createGain() {
    return { gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  }
}

const note = () => FakeContext.istanze.reduce((n, c) => n + c.oscillatori.length, 0);

beforeEach(() => {
  FakeContext.istanze = [];
  window.AudioContext = FakeContext;
  window.localStorage.clear();
  _reset();
});

afterEach(() => {
  delete window.AudioContext;
});

describe('soundService', () => {
  test('every named sound plays at least one note', () => {
    for (const nome of NOMI_SUONI) {
      const prima = note();
      suona(nome, { seme: 'Coppe' });
      expect(note()).toBeGreaterThan(prima);
    }
  });

  test('a game without sounds plays nothing', () => {
    setPartitaConSuoni(false);

    suona('estratta', { seme: 'Denari' });

    expect(note()).toBe(0);
    expect(FakeContext.istanze).toHaveLength(0);
  });

  test('a player who muted plays nothing, and the choice is kept for the next visit', () => {
    setMuto(true);

    suona('fine');

    expect(note()).toBe(0);
    expect(isMuto()).toBe(true);
    expect(window.localStorage.getItem('combocard.audio-muto')).toBe('1');
  });

  test('turning the sound back on plays again', () => {
    setMuto(true);
    setMuto(false);

    suona('estratta', { seme: 'Spade' });

    expect(isMuto()).toBe(false);
    expect(note()).toBeGreaterThan(0);
  });

  test('the four suits sound different', () => {
    const frequenze = ['Denari', 'Coppe', 'Spade', 'Bastoni'].map((seme) => {
      FakeContext.istanze = [];
      _reset();
      suona('estratta', { seme });
      return FakeContext.istanze[0].oscillatori[0].frequency.setValueAtTime.mock.calls[0][0];
    });

    expect(new Set(frequenze).size).toBe(4);
  });

  test('the audio is unlocked by a gesture: a suspended context is resumed', () => {
    sbloccaAudio();

    expect(FakeContext.istanze[0].resume).toHaveBeenCalled();
  });

  test('an unknown sound and a browser without Web Audio do nothing and never throw', () => {
    expect(() => suona('inesistente')).not.toThrow();
    delete window.AudioContext;
    _reset();
    expect(() => suona('estratta', { seme: 'Coppe' })).not.toThrow();
    expect(() => sbloccaAudio()).not.toThrow();
  });

  test('a storage that throws does not break it', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(isMuto()).toBe(false);
    spy.mockRestore();
  });
});
