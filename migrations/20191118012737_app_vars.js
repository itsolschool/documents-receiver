exports.up = function(knex) {
    return knex.schema.createTable('app_vars', (t) => {
        t.primary(['key'])
        t.string('key')
        t.string('value', 1000).notNullable()
    })
}

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('app_vars')
}
