exports.up = function(knex) {
    return knex.schema.createTable('app_vars', (t) => {
        t.primary(['key']);
        t.string('key');
        t.string('value').notNullable();
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('app_vars');
};
