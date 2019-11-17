exports.up = function(knex) {
    return knex.schema.alterTable('documents', (t) => {
        t.renameColumn('ownerTeam', 'teamId');
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('documents', (t) => {
        t.renameColumn('teamId', 'ownerTeam');
    });
};
