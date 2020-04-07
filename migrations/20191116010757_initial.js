exports.up = function(knex) {
    return knex.schema
        .createTable('teams', (t) => {
            t.increments('team_id').primary()
            t.integer('capacity')
                .unsigned()
                .defaultTo(5)
            t.string('name')
                .notNullable()
                .unique()
            t.string('school_name').notNullable()
            t.string('trello_card_id').nullable()
            t.string('gdrive_folder_id')
            t.boolean('is_admin').defaultTo(false)
            t.string('invite_token', 10).nullable()
        })
        .createTable('bot_users', (t) => {
            t.integer('tg_id').primary()
            t.string('full_name').notNullable()
            t.integer('team_id')
                .references('teams.team_id')
                .onDelete('CASCADE')
        })
        .createTable('documents', (t) => {
            t.integer('team_id')
                .references('teams.team_id')
                .onDelete('NO ACTION')
            t.increments('document_id').primary()
            t.integer('milestone')
                .notNullable()
                .comment('Номер периода, к которому относится этот документ')
            t.string('gdrive_file_id').notNullable()
            t.string('trello_attachment_id')
            t.dateTime('attached_time', { useTz: true })
                .defaultTo(knex.fn.now())
                .comment('Время загрузки документа')
        })
}

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('bot_users')
        .dropTableIfExists('teams')
        .dropTableIfExists('documents')
}
