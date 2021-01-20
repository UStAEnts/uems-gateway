import { Request } from 'express';

export const request = (query?: any, body?: any, params?: any): Request => ({
    query,
    body,
    params,
    uemsUser: MOCK_UEMS_USER,
} as unknown as Request);

export const MOCK_UEMS_USER = {
    userID: 'userid',
    username: 'username',
    profile: 'profile',
    fullName: 'fullname',
    email: 'email',
};

// GET /ents get-ents
export const GET_ENTS_VALID = {
    name: 'sFcjelLVv1q4j3gFLiT43w==',
    icon: 'Snqt7PzNguO33MQMfbSsjw==',
    color: '#485BFA',
    id: 'iWN62gemxERorjO5TSLPKw==',
};

// POST /ents post-ents
export const POST_ENTS_VALID = {
    name: '6Vh5+ees0DEVrAJlaDVOmw==',
    icon: 'wXqzYFs4MqJEWLG+nqwjOw==',
    color: '#5175C1',
};
export const POST_ENTS_MISSING = {
    icon: 'qam7RbQ3Gmj4p/I/37Wutw==',
    color: '#7A5CFB',
};

// GET /ents/{entID} get-ents-entID
export const GET_ENTS_ENTID_VALID = {};

// PATCH /ents/{entID} patch-ents-entID
export const PATCH_ENTS_ENTID_VALID = {
    name: 'vy8aUymIWPZkEgRFvusTRw==',
    icon: 'oxoyhRIxcdO8wvW+TJ5WOQ==',
    color: '#216AA5',
};

// GET /equipment get-equipment
export const GET_EQUIPMENT_VALID = {
    id: 'AuPCWnhFmWVHqS0IBmXX/Q==',
    assetID: 'dz9nL9ThicnismjbeOmQUg==',
    name: 'z7hW1HVuHEUmKYZOPvR2EA==',
    manufacturer: '+4ugfvmkP6VT9BpXbyQxhw==',
    model: 'IDvknhG3AY3t7/fiiZW6Mg==',
    miscIdentifier: 'BUO9EW3IEG9Ss/JR36xZkA==',
    amount: '106',
    locationID: 'yG9NL/Hj05ToK4LeC4cmsQ==',
    locationSpecifier: 'OMUi77El7N7qucjpMyKc7A==',
    managerID: 'U6fUPrYB9EkqH0aUt1TZsw==',
    date: '243',
    category: 'AcCY8dIltPQFi3u4wz894g==',
};
export const GET_EQUIPMENT_INVALID = {
    id: 'T03CpUbDqkIya3iQwyDKjg==',
    assetID: 'qT1ydrZCqhBqeth+Jz1OlA==',
    name: 'IpyrxOscFApcDkYWOlya0Q==',
    manufacturer: 'PBHtbUVUdX6eSFUeM6vFNw==',
    model: 'kc5FKKogSXwLdArc47C8yQ==',
    miscIdentifier: 'JW1lsMqZGuvyjOg/wwRh5w==',
    amount: 'tR7sqZGa3EOTdZAGjhCxsQ==',
    locationID: 'rCDwnWFoM2/8WzU1JKkeig==',
    locationSpecifier: 'W6gihbyWl5pzGq80uz9Hbg==',
    managerID: 'hBDSh+e7/Xqq5o1eeJxShA==',
    date: '932',
    category: 'OLXy1V6MWQt4dgEYA7GB7g==',
};

// POST /equipment post-equipment
export const POST_EQUIPMENT_VALID = {
    name: 'xKo3gLqYhVU8xyxuXgZEug==',
    manufacturer: '0Sqy0yHv29M0/eLvC/uqXg==',
    model: 'dtWxvVslH7DZYFzEpr9/1A==',
    amount: 114,
    locationID: 'OmLmMOZs651kuIyrspI5fg==',
    category: 'qzLDhbVEUJXH7hPQYqs4tw==',
    assetID: 'm8ud+OZtEH2CRh+PmWFZrw==',
    miscIdentifier: '4omx9Y3m0jIFcoZ2FK0Sig==',
    locationSpecifier: 'cEOZsSRiG34MVpri8uy75Q==',
};
export const POST_EQUIPMENT_INVALID = {
    name: 'tu0iVkkca29SsxApIlBmuw==',
    manufacturer: 'lOKwviJ8tGt+JTDatC1ERw==',
    model: 'Yd/GcSHtTIVreARJ637YIA==',
    amount: 'dxAoKx8s+WWumTlO6rnRmQ==',
    locationID: 't2KQU8oT09G/ylbFOoJl6Q==',
    category: 'rcYhhTi1fetEzsxZpQaoVw==',
    assetID: 'lhdrRol0TCtdncs9Dzl9Yg==',
    miscIdentifier: 'ufMcH6XssJgqIjbr5KHIng==',
    locationSpecifier: 'kDk7Sr1QnowOy9MyZ0JnzQ==',
};
export const POST_EQUIPMENT_MISSING = {
    manufacturer: '7VTglPs0tj+GITSXn4vQHw==',
    model: 'itNMhiybCrEfSrni+AWlBQ==',
    amount: 52,
    locationID: 'uNv5CxmoumtU8/OO1GsGrQ==',
    category: 'SS/bn6OROVAuuiP0MuLj5w==',
    assetID: 'fMtyBCtAMv7L3GKqblpCRw==',
    miscIdentifier: 'zishM3OJRuZDa/FQ5SRlEQ==',
    locationSpecifier: 'TmJ4WsaWKHXnFNM13UPhcw==',
};

// PATCH /equipment/{equipmentID} patch-equipment-equipmentID
export const PATCH_EQUIPMENT_EQUIPMENTID_VALID = {
    assetID: 'Hwq2IJYdCTgx6C1MKHCGEA==',
    name: 'jcrVrILN57Wo26Xo3Uy5Fg==',
    manufacturer: 'SDfWb/pCRrfvigeb/JSgtw==',
    model: 'FkXgD+kV7Ki250r3BqHJAA==',
    miscIdentifier: 'VeY/xTgt6JVs38wXAFuNcg==',
    amount: 999,
    locationID: 'naHUCjNq4nu5g3bk+SpoZw==',
    locationSpecifier: 'zUFZ6cJIMMcYCWykkx1Znw==',
    managerID: 'UwUqjjsW5J0BNNLGsL9LJw==',
    category: 'nZjDvxEJNRRHCib/oCfKHg==',
};
export const PATCH_EQUIPMENT_EQUIPMENTID_INVALID = {
    assetID: 'KRTU26UF2RAYa2yfWT0cBg==',
    name: 'ouQKtRK4gq3UYL8dtMK4TA==',
    manufacturer: '61v1SEN5uzOXrUcYD7spcA==',
    model: 'L5dajwjuIi0JSeOkPzs2dg==',
    miscIdentifier: 'KqzcbZ6y7W4oILHEd6szLg==',
    amount: 'ZGBTGHKwjHRo8nd31WbooQ==',
    locationID: '+x+PidllOnMGp9lCSpF27w==',
    locationSpecifier: 'ycn/BfsCajjo3Rcp8LWr4w==',
    managerID: '7ahEYRzltA0IKxfRE3bFqg==',
    category: 'WiCXCUJV6/NuWNWmwJQW5g==',
};

// GET /events get-events
export const GET_EVENTS_VALID = {
    name: 'FLljeAKMsHFiRWi8EIKpOw==',
    start: '762',
    end: '523',
    attendance: '297',
    venueIDs: 'Zsf4V7b5L3Rh2x+d7DGd1A==',
    venueCriteria: 'bSmstGZdglwkKWWS6KR2bg==',
    entsID: 'mpNKXDUwrf0E36ZYDH96hw==',
    stateID: 'glQsIBVnpWER4w0iaV8BCQ==',
    startafter: '466',
    startbefore: '89',
    endafter: '329',
    endbefore: '183',
    attendanceGreater: '936',
    attendanceLess: '111',
};
export const GET_EVENTS_INVALID = {
    name: 'OtVCZ+2iHyQLfHS1bD0QTA==',
    start: 'n69ThadP3KYEziw9PgOuTA==',
    end: '756',
    attendance: '782',
    venueIDs: 'atQM2VxP8PABBXLKIJ55ng==',
    venueCriteria: '12756FY288XSiK6H2+NkDw==',
    entsID: 'EGixEw0oaH44Pc3nTVTYXQ==',
    stateID: 'ZY4uDUt1Kt6Qbtfg5GSZeg==',
    startafter: '26',
    startbefore: '18',
    endafter: '915',
    endbefore: '604',
    attendanceGreater: '905',
    attendanceLess: '481',
};

// POST /events post-events
export const POST_EVENTS_VALID = {
    name: 'xMguzPq3NspXW5zp5RCrgA==',
    venue: 'eHFX6faC6Lc3t4+8+JsF5w==',
    start: 293,
    end: 734,
    attendance: 978,
    state: 'ALp5D21nsAQicFZ8kSY5Ow==',
    ents: 'BJPP5ltXSVIPbi+HZ1HGcQ==',
};
export const POST_EVENTS_INVALID = {
    name: 'tWO0OGSFZPwZPEooxJO7GA==',
    venue: '3b3iZ2I1vGAfrZFGnBT5vg==',
    start: 'qVyhI1zleIm2nf0cctyhDA==',
    end: 906,
    attendance: 776,
    state: 'cprK2DOCrRZpZB8qeGutJA==',
    ents: 'DIzW71mFM269TpusQmV5XQ==',
};
export const POST_EVENTS_MISSING = {
    venue: 'hry06Qw+cqz0IBbfyMhGsw==',
    start: 301,
    end: 317,
    attendance: 657,
    state: 'Pws2Doq7XX69BE5uThtUgQ==',
    ents: 'hriMRyTMeNgBFpC7WGHl8g==',
};

// PATCH /events/{eventID} patch-events-eventID
export const PATCH_EVENTS_EVENTID_VALID = {
    name: 'T21jDFLguFGXDTp6qRonOA==',
    start: 90,
    end: 450,
    attendance: 149,
    addVenues: null,
    removeVenues: null,
    ents: 'djgu/9UG+XidQ6SsP1KXpg==',
    state: 'FI7dz5xj/mIp3nfyYaBkwQ==',
};
export const PATCH_EVENTS_EVENTID_INVALID = {
    name: 'Ob8zKJU6uMvy5j/1dQ+bXw==',
    start: 'T+iWBbw/TcAm+Tw1R+ZKWg==',
    end: 903,
    attendance: 779,
    addVenues: null,
    removeVenues: null,
    ents: '1PGtEw+7pagZxQa1BD/LmQ==',
    state: 'Bn6XaSdZBbRMZKcLgVvNSw==',
};

// POST /events/{eventID}/comments post-events-eventID-comments
export const POST_EVENTS_EVENTID_COMMENTS_VALID = {
    category: 'C88GhbIgRa6fi1eYY+Hszw==',
    requiresAttention: false,
    body: 'I4DeCssnXdXda+YQYEIg7w==',
};
export const POST_EVENTS_EVENTID_COMMENTS_INVALID = {
    category: '2fj+nt+3OL9qK4XK+ne84w==',
    requiresAttention: 139,
    body: 'mKeE9t0ULOSQAasjrsoCag==',
};
export const POST_EVENTS_EVENTID_COMMENTS_MISSING = {
    category: 'fEl5kMrFZ9bww7skkjemYQ==',
    requiresAttention: true,
};

// GET /files get-files
export const GET_FILES_VALID = {
    id: 'qr8aZ5tIdpw5etcRkHDjyg==',
    name: 'LTe8x/ODPXvU0zujhc7VyA==',
    filename: '5YDUaBz0vkBkqSqlxhgTVQ==',
    size: '206',
    type: 'QMvbGN8tEpI2icZzWidteQ==',
    date: '524',
    userid: 'w8wWfmMUIvS6sg2zmNUZVw==',
};
export const GET_FILES_INVALID = {
    id: 'U2M7gqAtTxHFO1C+jlYn0g==',
    name: 'g88hiv4OIjw6NJC//CFmLg==',
    filename: 'DgEl7YSDPAiUrEQ9mdw8Hg==',
    size: 'K4rguSY40kFlRMI9oORWRw==',
    type: 'E+T5XUPyA3deJAQ3kp1lGw==',
    date: '953',
    userid: '1owzOufg7uo2He4VV5HsHw==',
};

// POST /files post-files
export const POST_FILES_VALID = {
    name: 'sr2+vYrK0iPdRZJh7f8xvg==',
    filename: 'vAXHoztJw/5fARXzbP2IbA==',
    size: 190,
    type: 'qAjeHzGuDeVFZyC34S7aEg==',
};
export const POST_FILES_INVALID = {
    name: 'u7/tT/QZqTtG3e5S9ppcJw==',
    filename: 'C3wqAHC2PQLxhL0KQMuf7w==',
    size: 'zHKRvj6u9YiL2nkgZS35ZQ==',
    type: 'A4as/OUt1zG5rUE812iTqA==',
};
export const POST_FILES_MISSING = {
    filename: 'EByN3jpwj0ifrm25DYjXug==',
    size: 804,
    type: 'vIaQCpvkVkPAs14QuBs6cQ==',
};

// PATCH /files/{fileID} patch-files-fileID
export const PATCH_FILES_FILEID_VALID = {
    name: 'aCDvls5EYnoygWBHwwO4GA==',
    type: '2zm5v9FtuMFTlmXBLc/Fww==',
};

// POST /events/{eventID}/files post-events-eventID-files
export const POST_EVENTS_EVENTID_FILES_VALID = { fileID: 'YGf0HOBsNyK7HL/++SxTIQ==' };
export const POST_EVENTS_EVENTID_FILES_MISSING = {};

// GET /events/{eventID}/signups get-events-eventID-signups
export const GET_EVENTS_EVENTID_SIGNUPS_VALID = {
    id: 'Al1UJgi6TUnIXLuaxMJ07Q==',
    date: '427',
    userid: 'eLcwIcQvcPyCRL4yqVg2XQ==',
    dateRangeBegin: '678',
    dateRangeEnd: '486',
    role: 'Jv2k1p38NFv+dXPMb+kEAg==',
};
export const GET_EVENTS_EVENTID_SIGNUPS_INVALID = {
    id: 'oqLa8o4FGxdoSD3eOJavSw==',
    date: '4CMSFJX0zyAJ4KzYGyV9lA==',
    userid: '8DRelD+fmZ7NA+/3z5tO5w==',
    dateRangeBegin: '239',
    dateRangeEnd: '120',
    role: 'Aj7ILDXfEAeP6XoH/O3OlA==',
};

// POST /events/{eventID}/signups post-events-eventID-signups
export const POST_EVENTS_EVENTID_SIGNUPS_VALID = { role: 'nhlJaRScpQjykVCOOexo8w==' };
export const POST_EVENTS_EVENTID_SIGNUPS_MISSING = {};

// PATCH /events/{eventID}/signups/{signupID} patch-events-eventID-signups-signupID
export const PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID = { role: 'cGAQgj/LAxDFS4QqRqKaGg==' };

// GET /states get-states
export const GET_STATES_VALID = {
    name: 'd6y1JPIM3lyJfLZyggHUNQ==',
    icon: '0Dteyn4cXYS19yAIva6rnw==',
    color: '#A92723',
    id: 'bjOGt2geb3aIC8EqufdfOg==',
};

// POST /states post-states
export const POST_STATES_VALID = {
    name: 'kPft3KV3VR9M5d+EjgPPgQ==',
    icon: '/Ae4s14qctusoHcen69rxw==',
    color: '#3E4BB1',
};
export const POST_STATES_MISSING = {
    icon: 'q3Xg3WPxtWnDSZjUe8D3QQ==',
    color: '#CED35A',
};

// PATCH /states/{stateID} patch-states-stateID
export const PATCH_STATES_STATEID_VALID = {
    name: '68gmrxyJrhsFT20yFdQErA==',
    icon: 'BGnBFD6WBoZ42HlQFHWwEw==',
    color: '#B0BDCA',
};

// GET /topics get-topics
export const GET_TOPICS_VALID = {
    name: 'mDE7Q2y9XhIGVfJieQbahw==',
    icon: 'cSu3b7pUeX53gyAzSR6iBw==',
    color: '#FAAC02',
    id: 'n+++tfmibpLJ6uG8l3jOBw==',
    description: 'bKVq6TlruocJduDf6kjZcw==',
};

// POST /topics post-topics
export const POST_TOPICS_VALID = {
    name: 'mzUKOFtXy9ME6oHdbOG61A==',
    icon: 'nw8KzMQ3vp8TQboY6mEnhA==',
    color: '#864CCB',
    description: 'XrEY3vZl6r/GZ+hB5gPSDw==',
};
export const POST_TOPICS_MISSING = {
    icon: 'SAUou9lexv2oXsJArVSeqQ==',
    color: '#99FA51',
    description: 'PpxOD4mjXMFwVsBp6rURsw==',
};

// PATCH /topics/{topicID} patch-topics-topicID
export const PATCH_TOPICS_TOPICID_VALID = {
    name: 'y0qouL+jy0+/pQVcLV1hvw==',
    color: '#E0F42E',
    icon: 'HJHorAZpCNXGjK57h7ljtg==',
    description: '2wck2CtiGxNsP6xlpe31RA==',
};

// GET /user get-user
export const GET_USER_VALID = {
    id: 'BWgpyU/WCz4oC++46zyQKA==',
    name: 'FaIUYgwZda7xWa8jKURz9g==',
    username: 'YzasOwndxSDmRTz+In8usg==',
    email: 'a+KXpZkV6vivRiRbNsULTQ==',
    includeEmail: 'false',
    includeHash: 'true',
};
export const GET_USER_INVALID = {
    id: '6M0yVt/xuuGZ0IfuUr3qwQ==',
    name: 'DUwiiTHOhA88pzU+TJ2c1w==',
    username: 'SdVfgCMHjpvpEaA5zAJZrA==',
    email: '7oeQCZuncfISjj8QxwDMsg==',
    includeEmail: '850',
    includeHash: 'true',
};

// POST /user post-user
export const POST_USER_VALID = {
    name: 'G4oVxZNU4He+PUSHtBOomw==',
    username: 'OZhqmIKcQMZbUQIq0LS01w==',
    email: '9Y67qNI09qv2wP905OYeiQ==',
    hash: 'Z+MevGWuMnzNSOKp43VMyw==',
    profile: '9iWsxlMJ8D+8lVCIJw8wNw==',
};
export const POST_USER_MISSING = {
    username: '4gpKO4T/JI2bfjIMfeK85g==',
    email: 'Wnq7dbvLgw+Zje+X43YuMQ==',
    hash: 'WHcyC+s1Mp+mBcnCUzrlzg==',
    profile: 'rLZFNbL15D1LsLZDq2nrjQ==',
};

// PATCH /user/{userID} patch-user-userID
export const PATCH_USER_USERID_VALID = {
    name: 'GZ/wNbNrQU++1pQXsdC/gQ==',
    username: 'RJMECg9pjvx6oNW6HHCmDw==',
    email: 'wgLA+1Am/2NLkUlYHrcuQQ==',
    hash: 'QQI1J8+6JqSdnJcWgBVQOg==',
    profile: 'tfLfhezI9l+CSsh4obhcOA==',
};

// GET /venues get-venues
export const GET_VENUES_VALID = {
    name: '8vCaCbHT8qdNtSQ4JYmEdw==',
    capacity: '146',
    approximate_capacity: '957',
    approximate_fuzziness: '842',
    minimum_capacity: '133',
    maximum_capacity: '484',
};
export const GET_VENUES_INVALID = {
    name: 'PpmgSNJg7xmPcWLgmtCirg==',
    capacity: 'M0R34vCrRuioRUxDddW5KQ==',
    approximate_capacity: '175',
    approximate_fuzziness: '450',
    minimum_capacity: '560',
    maximum_capacity: '320',
};

// POST /venues post-venues
export const POST_VENUES_VALID = {
    name: 'D6LqM7xyfL1Pm/2bVDD56A==',
    capacity: 708,
    color: '#F1FE19',
};
export const POST_VENUES_INVALID = {
    name: 'zqlocOAGIM5ilTDPxJHpzQ==',
    capacity: 'vE0ASTYkQAa1guSJt8voZw==',
    color: '#84C1C4',
};
export const POST_VENUES_MISSING = {
    capacity: 317,
    color: '#A130A3',
};

// PATCH /venues/{venueID} patch-venues-venueID
export const PATCH_VENUES_VENUEID_VALID = {
    name: 'r95rsiRWeuTdT0Ca1cX5vw==',
    capacity: 274,
    color: '#C23E2D',
};
export const PATCH_VENUES_VENUEID_INVALID = {
    name: 'eP3i7MXTXn50OnzDE7WjsQ==',
    capacity: 'VDYUI/8OPsa5mgjIySStxg==',
    color: '#F0AD89',
};
