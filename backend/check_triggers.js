import sequelize from './config/database.js';

sequelize.query('SHOW TRIGGERS')
  .then(triggers => {
    console.log('Todos los triggers:');
    console.log(JSON.stringify(triggers, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
