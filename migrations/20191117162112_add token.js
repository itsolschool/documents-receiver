exports.up = function(knex) {
    return knex.schema.table('teams', (t) => {
        t.string('inviteToken', 10).nullable();
    });
};

exports.down = function(knex) {
    return knex.schema.table('teams', (t) => {
        t.dropColumn('inviteToken');
    });
};
