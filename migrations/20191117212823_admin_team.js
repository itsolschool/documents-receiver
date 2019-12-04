exports.up = function(knex) {
    return knex.schema.alterTable('teams', (t) => {
        t.boolean('isAdmin').defaultTo(false)
    })
}

exports.down = function(knex) {
    return knex.schema.alterTable('teams', (t) => {
        t.dropColumn('isAdmin')
    })
}
