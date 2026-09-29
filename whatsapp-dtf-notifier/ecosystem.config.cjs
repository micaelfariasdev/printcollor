module.exports = {
  apps: [{
    name: 'whatsapp-dtf-notifier',
    script: 'src/server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '350M',
    env: {
      NODE_ENV: 'production',
      PORT: 3100,
      SESSION_DIR: '/root/printcollor/printcollor/whatsapp-dtf-notifier/session',
      NOTIFIER_TOKEN: 'TROQUE_POR_UMA_CHAVE_LONGA_E_ALEATORIA',
    },
  }],
};
