const path = require('path');
const { Pact } = require('@pact-foundation/pact');
const { like, term } = require('@pact-foundation/pact').Matchers;
const axios = require('axios');

describe('Monitoring system -> /metrics contract test', () => {
	const mockProvider = new Pact({
    consumer: 'monitoring-system',
    provider: 'gold-api',
    port: 1234,      
    host: '127.0.0.1',
    dir: path.resolve(process.cwd(), 'pact/pacts'), 
    log: path.resolve(process.cwd(), 'pact/logs', 'mockprovider.log'),
    // log: path.resolve(process.cwd(), "pact/logs", "pact.log"),
		logLevel: 'debug',
    spec: 2
  });
  

  beforeAll(async () => {
    await mockProvider.setup();
  });

  afterAll(async () => {
    await mockProvider.finalize();
    console.log("finallized!!!!!!!!!!!!!");
    console.log(mockProvider.opts.log);
  });
  
  describe('GET /metrics', () => {
    beforeAll(async () => {
      // Định nghĩa interaction cho mock provider
      await mockProvider.addInteraction({
        state: 'provider is up and has some metrics',
        uponReceiving: 'a request for /metrics',
        withRequest: {
          method: 'GET',
          path: '/metrics'
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          body: term({
            // Kiểm tra nội dung text, vd: có chứa cụm # HELP process_cpu_user_seconds_total
            // '^' là bắt đầu chuỗi, '.*' khớp với bất kỳ. 
            // '(# HELP process_cpu_user_seconds_total.*# TYPE process_cpu_user_seconds_total counter)' 
            // -> Mẫu regex chỉ là ví dụ. Tùy bạn tinh chỉnh.
            generate: '(# HELP process_cpu_user_seconds_total \n# TYPE process_cpu_user_seconds_total counter\n)',
            matcher: '.*process_cpu_user_seconds_total.*'
          })
        }
      });
    });

    it('should receive metrics from provider', async () => {
      // Gọi mock server thay vì service thật
      const response = await axios.get('http://127.0.0.1:1234/metrics', { responseType: 'text' });
      expect(response.status).toBe(200);
    	expect(typeof response.data).toBe('string');
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toMatch(/process_cpu_user_seconds_total/);

      await mockProvider.verify();
    });
  });
});
