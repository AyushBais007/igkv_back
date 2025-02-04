

exports.getPasswordResetQueryParam = function (Case, user_id, user_type, div_id, district_id, tehsil_id, subdistrict_code) {
    let whereClause = ` WHERE `;
    switch (Case) {
        case 1:
            whereClause += ` u.usertype = ${user_type}`;
            break;
        case 2:
            whereClause += ` u.usertype = ${user_type} AND u.user_id = ${user_id}`;
            break;
        case 3:
            whereClause += ` u.usertype = ${user_type} AND u.div_id = ${div_id}`;
            break;
        case 4:
            whereClause += ` u.usertype = ${user_type} AND u.district_id = ${district_id}`;
            break;
        case 5:
            whereClause += ` u.usertype = ${user_type} AND u.district_id = ${district_id} AND u.tehsil_id = ${tehsil_id}`;
            break;
        case 6:
            whereClause += ` u.usertype = ${user_type} AND u.district_id = ${district_id} AND u.subdistrict_code = ${subdistrict_code}`;
            break;
        default:
            break;
    }
    let q = `UPDATE users u
    SET u.password = DEFAULT,
    u.password_flag = 0 ${whereClause};`,
        p = [];
    return { "query": q, "params": p };
}
exports.userDetailsByUserId = function (user_id) {
    return {
        query: `SELECT u.*,md.District_Name from users u 
            left JOIN mas_districts md ON md.District_ID = u.district_id
            where u.user_id =  ${user_id} `, params: []
    }
}
exports.getBankLoginDetails = function (bank_login_id) {
    return {
        query: ` SELECT u.username,mcb.district_id FROM users u
    INNER JOIN mas_user_type mut ON u.usertype = mut.usertype
    LEFT JOIN mas_cooperative_bank mcb ON mcb.c_bank_code = u.user_id
    WHERE u.user_id =  ${bank_login_id} `, params: []
    }
}