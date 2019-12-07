exports.up = function(knex) {
    return knex.schema.alterTable('app_vars', (t) => {
        t.string('value', 1000).alter()
    })
}
exports.down = function(knex) {
    return knex.schema.alterTable('app_vars', (t) => {
        t.string('value').alter()
    })
}
