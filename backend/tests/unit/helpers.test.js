// backend/tests/unit/helpers.test.js

describe('Helper Functions', () => {
  describe('replaceVars', () => {
    // Test variable replacement logic
    function replaceVars(text, vars) {
      return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
    }

    it('should replace single variable', () => {
      const result = replaceVars('Hello {{name}}', { name: 'John' });
      expect(result).toBe('Hello John');
    });

    it('should replace multiple variables', () => {
      const result = replaceVars('{{greeting}} {{name}}!', {
        greeting: 'Hello',
        name: 'World'
      });
      expect(result).toBe('Hello World!');
    });

    it('should handle missing variables', () => {
      const result = replaceVars('Hello {{missing}}', {});
      expect(result).toBe('Hello ');
    });

    it('should handle empty text', () => {
      const result = replaceVars('', { name: 'John' });
      expect(result).toBe('');
    });

    it('should handle null/undefined', () => {
      const result1 = replaceVars(null, {});
      const result2 = replaceVars(undefined, {});
      expect(result1).toBe('null');
      expect(result2).toBe('undefined');
    });
  });

  describe('matchReply', () => {
    // Test reply matching logic from flowWorker
    function matchReply(conds, inboundText, inboundPayload) {
      const text = String(inboundText || '').trim();
      const payload = String(inboundPayload || '').trim();

      // Payload match
      const byPayload = conds.find(c =>
        c.type === 'payload' && c.value && payload &&
        c.value.split('|').map(s => s.trim()).filter(Boolean).some(p => p === payload)
      );
      if (byPayload) {
        return byPayload;
      }

      // Keywords match
      const byKw = conds.find(c =>
        c.type === 'keywords' && c.value && text &&
        c.value.toLowerCase().split('|').map(s => s.trim()).filter(Boolean)
          .some(k => text.toLowerCase().includes(k))
      );
      if (byKw) {
        return byKw;
      }

      // Fallback
      const fb = conds.find(c => c.isFallback);
      if (fb) {
        return fb;
      }

      return null;
    }

    it('should match by payload', () => {
      const conds = [
        { type: 'payload', value: 'yes|sim', target: 'node1' }
      ];
      const result = matchReply(conds, '', 'yes');
      expect(result.target).toBe('node1');
    });

    it('should match by keywords', () => {
      const conds = [
        { type: 'keywords', value: 'yes|sim|OK', target: 'node1' }
      ];
      const result = matchReply(conds, 'Yes please', '');
      expect(result.target).toBe('node1');
    });

    it('should match fallback when no match', () => {
      const conds = [
        { type: 'keywords', value: 'yes', target: 'node1' },
        { type: 'fallback', isFallback: true, target: 'node2' }
      ];
      const result = matchReply(conds, 'no', '');
      expect(result.target).toBe('node2');
    });

    it('should return null when no match and no fallback', () => {
      const conds = [
        { type: 'keywords', value: 'yes', target: 'node1' }
      ];
      const result = matchReply(conds, 'no', '');
      expect(result).toBeNull();
    });
  });

  describe('sleep', () => {
    it('should resolve after delay', async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });
});
