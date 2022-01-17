import { Request } from "express";

export const request = (query?: any, body?: any, params?: any, roles?: string[]): Request => ({
    query,
    body,
    params,
    uemsUser: MOCK_UEMS_USER,
    kauth: {
        grant: {
            access_token: {
                hasRole: (role: string) => (roles ?? []).includes(role),
            },
        },
    },
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
    name: 'wGKoIHGtWAvBLPLu4pJ5uQ==',
    icon: '6VsWd1lxwJ2aYOZryYP+sw==',
    color: '#CBF0A4',
    id: 'ha+MskZiOR1pkMhVCVY7nw=='
}
export const GET_ENTS_INVALID = {
    name: 'KCHbfQ2m0Sb77P/E64iqUQ==',
    icon: 'k9qq2oGIRX7bJN5oR6aOFw==',
    color: 'J7JUuF/rHK7Pv4y8U4ZDKA==',
    id: 'wTRlX5H7WooEp712QvpBlg=='
}

// POST /ents post-ents
export const POST_ENTS_VALID = {
    name: '36kYN11B1q4tZhwXarmQiw==',
    icon: '1gEXcrC936uLDYlRzg4WLQ==',
    color: '#E79126'
}
export const POST_ENTS_INVALID = {
    name: 'o2fmW0cFyss1urgMYylICg==',
    icon: 'BqyJIKNx4biv5kJHwKy6fg==',
    color: 'i0FpRf6DL3PExwaJaglSfw=='
}
export const POST_ENTS_MISSING = {
    icon: 'AWmAXFSPzAZM+fHOQV3qiw==',
    color: '#3CB5BD'
}

// GET /ents/{entID} get-ents-entID
export const GET_ENTS_ENTID_VALID = {}

// PATCH /ents/{entID} patch-ents-entID
export const PATCH_ENTS_ENTID_VALID = {
    name: 'AZQCtkKF+Az61eyOy59PkA==',
    icon: 'RSat3Q20NOD33I0joWmmKw==',
    color: '#4C0D68'
}
export const PATCH_ENTS_ENTID_INVALID = {
    name: 'b6wtwUiJCA8GRE9c6MxmXg==',
    icon: 'bkUaUlVVjyA84rJChaJkJg==',
    color: 'fpWOpwSaOwdNvDQOjfPjPg=='
}

// GET /equipment get-equipment
export const GET_EQUIPMENT_VALID = {
    id: 'aQsdBc5mJc4XIxg/sgHguQ==',
    assetID: 'A/fr4GjF+qAbOC1xgDQQ8w==',
    name: 'oUr0QPu9mnO8ch33nfAfiA==',
    manufacturer: '3ZJap2KxQlvsFg0tYDF1kg==',
    model: 'A/cWmduw++W2aC2nRiVMxw==',
    miscIdentifier: 'uwVJFSfRQo7Nx8P9KBnHHA==',
    amount: '496',
    locationID: 'jPDoQLHCrRx/hAzVDNAhgQ==',
    locationSpecifier: 'WFmoTAXWZQTq0MA7XcOejA==',
    managerID: 'O6HxxfQVaoEcIyc5ZHpPLA==',
    date: '850',
    category: 'K4SGep5mdWNnA3TSHy+rpQ=='
}
export const GET_EQUIPMENT_INVALID = {
    id: '4B7k73G+lUOezcWr57r4ZQ==',
    assetID: 'O3c6vtr3wOofpE8ic2rrbQ==',
    name: 'Nei3aU81iVm/LmMI8Tkcow==',
    manufacturer: 'D3ZPi+1IlUCD84iXYBJY2Q==',
    model: 'HKH44ge/2YKJI0NmHGzeDg==',
    miscIdentifier: '84Xrc9INsIFx7WO++sIc2g==',
    amount: 'Fzboi/78i8nhBoEj+noXaA==',
    locationID: 'Ia+c5dwhjOosHAvTcyUn8w==',
    locationSpecifier: 'HF9cDh2f5HP5EezWFAjTmQ==',
    managerID: 'DqzpezsTvUDYtNfOC+fSfQ==',
    date: '196',
    category: 'Xd2sVR7R846ZmJurlafJWA=='
}

// POST /equipment post-equipment
export const POST_EQUIPMENT_VALID = {
    name: 'trYZUDoy/2Lcb1cxi+nZnQ==',
    manufacturer: 'ptsHY055OjM+6sgtXAmNtQ==',
    model: 'r4u3ix9IX1TG3AlBgcXNRw==',
    amount: 977,
    locationID: 'xIW+TgcpFi4u4Pe483hnKQ==',
    category: 'SM7uDNy5F1PWZa3mnOCq5A==',
    assetID: 'wwSpqCpYPV7jZ/qKYChiMw==',
    miscIdentifier: 'HOYo0sN7JIgxe409JOAZhA==',
    locationSpecifier: 'a9t/m3vPxD2qf8fqU83rIw=='
}
export const POST_EQUIPMENT_INVALID = {
    name: 'd0hLOu/vXyP4LNoaI+/spA==',
    manufacturer: 'aOEodTu8lq+APy8qeg+l9A==',
    model: 'gTfLNm+TjMpTD5IdodW6cw==',
    amount: 'ZZFV0Xu4M5Ym1HRe9yz5bg==',
    locationID: 'ssO8uAwM1ajeJCQDOG0WtQ==',
    category: 'G4YQQDc24syEpYTdZG+JgA==',
    assetID: 'Q1cMBFUBZx/KRYFPI6GC5Q==',
    miscIdentifier: 'cv1j3valRz25cjmqUbYSSQ==',
    locationSpecifier: 'Yow4125VP5SI0vB1Neh50g=='
}
export const POST_EQUIPMENT_MISSING = {
    manufacturer: 'ZPxjDWxG9uKw/jsbqh3Kyw==',
    model: 'TWj16rUAQiuGC0mYACg9bg==',
    amount: 488,
    locationID: 'yiXxG5+uxQIXxn3XEUJvIg==',
    category: 'c1maZc9XxTdWwVZ+LQA8EQ==',
    assetID: 'LwzhnlO+FPHegxyNA1Ddbg==',
    miscIdentifier: '+Zl5V4xVUvGQ00PxOUxV0Q==',
    locationSpecifier: 'G0y+RRHQ0OnfWFfuNR270g=='
}

// PATCH /equipment/{equipmentID} patch-equipment-equipmentID
export const PATCH_EQUIPMENT_EQUIPMENTID_VALID = {
    assetID: 'SHLn9cdHwrLhFrkG5CsnBg==',
    name: 'bEnxQBGdyF1B6Ygvul2uXQ==',
    manufacturer: 'nXIWFUsoun/HH1WfD96FsA==',
    model: 'V0F7f4Z4ap9M4XTK/zXX0Q==',
    miscIdentifier: 'iAXg+FRRaYO4Cz2I0nIohg==',
    amount: 316,
    locationID: 'nytybT2hwfNOwQeMlKHNdQ==',
    locationSpecifier: 'zKLvZpGh4OC2+Z+XfoOnUg==',
    managerID: 'JtWMy2VEad2hBekcqk4BFQ==',
    category: 'bbqTWIblXfxQLxKtZZVZqw=='
}
export const PATCH_EQUIPMENT_EQUIPMENTID_INVALID = {
    assetID: 'Pj6swmWsbL4801ns0qz/dQ==',
    name: 'yhChKixM9dXh6+LWfC29dg==',
    manufacturer: 'DewhxdZzJ+EPtEV8BNl8ug==',
    model: 'g+NeO5OdIn22tStZZiH7+A==',
    miscIdentifier: 'xGPWhURw02hv+8sl6AZp6Q==',
    amount: 'TYuxO6w8V9U3aDP3UEk74Q==',
    locationID: 'KqpZo0cpDJmbRK6ePLY84A==',
    locationSpecifier: 'xExldj8PaE/sww5EPYF/Zw==',
    managerID: '+6a1W0ixF506jWQz4NWtig==',
    category: '2J+JWy01JyC/MJnMKinPGg=='
}

// GET /events get-events
export const GET_EVENTS_VALID = {
    name: 'v65gON8vdbasSJzj9QBfHQ==',
    start: '696',
    end: '178',
    attendance: '183',
    venueIDs: ['SHh2H5fi01Gafodw0CF1Mg=='],
    venueCriteria: 'TSBBBd34hu0f8DaBEoTJtw==',
    entsID: 'is/YT0P7QV8QFqGntGlbJQ==',
    stateID: '9oFgV87Bggl1plcbmO0t2A==',
    startafter: '687',
    startbefore: '67',
    endafter: '770',
    endbefore: '155',
    attendanceGreater: '287',
    attendanceLess: '288'
}
export const GET_EVENTS_INVALID = {
    name: 'Oto0/wtBLhItL83tDiTxhA==',
    start: 'ZMiEnkgZehQs/741e7tVMw==',
    end: '581',
    attendance: '336',
    venueIDs: 'vmMI41He0xADa4gY3UZL0Q==',
    venueCriteria: 'mgpsUzcSbLaNghB6wsIE4Q==',
    entsID: 'GnL4taJNuIS3JQ/vGzIgUg==',
    stateID: 'a63BnHpp3uWIX8Bs5PJjQA==',
    startafter: '682',
    startbefore: '778',
    endafter: '998',
    endbefore: '390',
    attendanceGreater: '399',
    attendanceLess: '549'
}

// POST /events post-events
export const POST_EVENTS_VALID = {
    name: 'bF95220sLPKYDmOrimFvyA==',
    venue: 'l54pmQPNIG1RapaYgPviqg==',
    start: 204,
    end: 719,
    attendance: 356,
    state: 'DTJYibnaimbq51mYPRiPvQ==',
    ents: 'GC/r/vVoiAyR1pM4uVb7Jw=='
}
export const POST_EVENTS_INVALID = {
    name: 'FNcDrJIxtPMSqlx66TuJTQ==',
    venue: 'xzOTsTWTmhC99bYzIBTE8A==',
    start: 'lgDdS2URS4lu0KwOCtZ9Yg==',
    end: 450,
    attendance: 764,
    state: 'jy2GaQLwFqIMkSIeJK0WXQ==',
    ents: 'kxXvRbbrEiTZtWLCxH7+jg=='
}
export const POST_EVENTS_MISSING = {
    venue: 'W+/hGpCkPu7ItyKtcM4ZOg==',
    start: 458,
    end: 750,
    attendance: 809,
    state: 'UdX5tHIz/WPUZ9N/qRJzVw==',
    ents: 'KwJV1II+03P8r4gojtcs7w=='
}

// PATCH /events/{eventID} patch-events-eventID
export const PATCH_EVENTS_EVENTID_VALID = {
    name: 'qB2uoAbjfz2817lVWGqDyw==',
    start: 185,
    end: 810,
    attendance: 629,
    addVenues: [],
    removeVenues: [],
    ents: 'VMudmK8kEkbPsjDrNKs3uw==',
    state: 'a9GZfyK/zEywqEbyBN7YpA=='
}
export const PATCH_EVENTS_EVENTID_INVALID = {
    name: 'TNib8Bog5+gnL/5nfxt8Sw==',
    start: '+coh9LYFET3Nxdd41VLjKA==',
    end: 172,
    attendance: 11,
    addVenues: null,
    removeVenues: null,
    ents: 'NStFyZhh7Bg5t0tPh7hoXQ==',
    state: 'GIvrkEt59U4U70cwSXfvKw=='
}

// POST /events/{eventID}/comments post-events-eventID-comments
export const POST_EVENTS_EVENTID_COMMENTS_VALID = {
    topic: 'OyTInYyBtLVfLmRrniMT+w==',
    requiresAttention: true,
    body: 'X6c0MbAJGLM5ex/eKaeY0Q=='
}
export const POST_EVENTS_EVENTID_COMMENTS_INVALID = {
    topic: 'khfhrN5S3MLPZSZGZKd+EA==',
    requiresAttention: 995,
    body: 'lmjd6Utd1brUFgTLyTP4gg=='
}
export const POST_EVENTS_EVENTID_COMMENTS_MISSING = {
    topic: 'ignbgtQRw6vMpr7GWc9kkw==',
    requiresAttention: true
}

// GET /files get-files
export const GET_FILES_VALID = {
    id: 'uh9mAfU7OuHv+i1YuSnEmw==',
    name: 'NhxUB+AOWuObGkosPT51uQ==',
    filename: 'sVzgKVk3CY4t5BV6A8yTqw==',
    size: '53',
    type: 'm9yjnAw7AH1R8FT0yGVDeQ==',
    date: '53',
    userid: '2UhQFpwmWR2chUaPwRY94w=='
}
export const GET_FILES_INVALID = {
    id: '1vvM/ndhe69Fm5ybbgiW3Q==',
    name: 'He3WIFzqhMFXo3r/ntKmpw==',
    filename: 'RnZPARGBkHZbEMxFoqbK3g==',
    size: 'mltYadHyKuH6bHkg0v1t7w==',
    type: 'LfTeLwX0Ymu4+1PNaQhPJQ==',
    date: '823',
    userid: 'lXoG0CHTGZdjg/mIV2Aa/A=='
}

// POST /files post-files
export const POST_FILES_VALID = {
    name: 'WMpug2zRPEnAlpYYYKZ4BA==',
    filename: 'HJssmV9ftckN8lw6qCmc/Q==',
    size: 111,
    type: 'UwS6zLon2OPvw8cewQV9hw=='
}
export const POST_FILES_INVALID = {
    name: 'nF1thAmKPLQyM5v+3NKH6w==',
    filename: 'LbOS9uG/LsPFbuadN07img==',
    size: 'XB+ZT32hzLj8Ha01wlvwJQ==',
    type: '1FBC/3r0nMA5X9WMykf6HQ=='
}
export const POST_FILES_MISSING = {
    filename: 'gljKknEkEw5b2nivxsj+ZA==',
    size: 738,
    type: 'd+SCb7pEno2mIt45GAu/jQ=='
}

// PATCH /files/{fileID} patch-files-fileID
export const PATCH_FILES_FILEID_VALID = {
    name: 'Bdrw0Wz7zOWf0qanGPMsrw==',
    type: 'egYZY3zGx+7u++9tanBWxw=='
}

// POST /events/{eventID}/files post-events-eventID-files
export const POST_EVENTS_EVENTID_FILES_VALID = { fileID: '7oYjUS5DbFyaZy/pUMTT/w==' }
export const POST_EVENTS_EVENTID_FILES_MISSING = {}

// GET /events/{eventID}/signups get-events-eventID-signups
export const GET_EVENTS_EVENTID_SIGNUPS_VALID = {
    id: 'JuxQcIdSZlgI+t//EHyNwA==',
    date: '656',
    dateRangeBegin: '794',
    dateRangeEnd: '865',
    role: 'qIVDB4H8HBdRQb5M1Y00vw=='
}
export const GET_EVENTS_EVENTID_SIGNUPS_INVALID = {
    id: 'S+TSwDP1HyBiU9EkB0Q0lw==',
    date: 'm4rQjzCMj8EbUb52c/M9og==',
    userid: 'zhlzFlkfculWtj2X07dPSQ==',
    dateRangeBegin: '82',
    dateRangeEnd: '233',
    role: '0Urgj1UQTqj6KwW3ypLMHg=='
}

// POST /events/{eventID}/signups post-events-eventID-signups
export const POST_EVENTS_EVENTID_SIGNUPS_VALID = { role: 'SorMl/WvZrT1N4uzM1uyXg==' }
export const POST_EVENTS_EVENTID_SIGNUPS_MISSING = {}

// PATCH /events/{eventID}/signups/{signupID} patch-events-eventID-signups-signupID
export const PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID = { role: 'MTLrrodgAkC/no0Dfqdkbg==' }

// GET /states get-states
export const GET_STATES_VALID = {
    name: '7QgMvsZQS+HlL2y++n64SA==',
    icon: 'JBqVwhwuAFf+NJF7jsCXKQ==',
    color: '#34BDBA',
    id: 'AfytqJWRnbzKoOKC8T6QIQ=='
}
export const GET_STATES_INVALID = {
    name: 'bYBCIYnQoQn3ch/qKUVvow==',
    icon: 'HMVBeE9YRbGdMpwiWc6Nvg==',
    color: 'v/Ht4PEv1gMhTGOde760Xw==',
    id: 'wu3cZnqN5OHIRwwTx2Shpg=='
}

// POST /states post-states
export const POST_STATES_VALID = {
    name: 'lyafdiuC9FoP7oCBvdpeDA==',
    icon: 'AfgOxUWtVQL3PrmcIYCHYA==',
    color: '#A6CFFC'
}
export const POST_STATES_INVALID = {
    name: '12ntv22xYuM/jbPo2bb0mg==',
    icon: 'iz5iHX6Yy3bHQh1e4KnMow==',
    color: 'Eu+T4aBSbE5b03Ov1wgUBw=='
}
export const POST_STATES_MISSING = {
    icon: 'MVPV6XEyjwx7JKpZQp2Tvw==',
    color: '#DF28C3'
}

// PATCH /states/{stateID} patch-states-stateID
export const PATCH_STATES_STATEID_VALID = {
    name: 'nFMHQj2ggIVkK3m3w1Hwgw==',
    icon: 'keHpf/pATgfyLipnTVF7cg==',
    color: '#D74C97'
}
export const PATCH_STATES_STATEID_INVALID = {
    name: 'xDI1Pol5BvnQhbL/KdSY7A==',
    icon: 'rt7qQpthl6u33q/X5KFALQ==',
    color: 'eFS8qI9Ct1MBmGajky4g8A=='
}

// GET /topics get-topics
export const GET_TOPICS_VALID = {
    name: 'q1keVc9LfloG11QlUR9QdQ==',
    icon: 'h4RQkm1sgR0W4+Tb8wM/KQ==',
    color: '#6DE544',
    id: '0hvFd7wDNk/T/M+q/a7JPg==',
    description: 'Xiz1WW0nys6e36odol/uag=='
}
export const GET_TOPICS_INVALID = {
    name: 'cdDYDyjYgtU0Ra6qgOZDmA==',
    icon: 'P0mRM/IapXqnkppmcWN3Kw==',
    color: 'l0vgFzpQqt+0W0P0+//vfw==',
    id: 'ypwlgvp8wPrIFH4B6YJ0Nw==',
    description: 't41IzsQ9hcgBeLeEsH99Dg=='
}

// POST /topics post-topics
export const POST_TOPICS_VALID = {
    name: 'Q9SAaIgRuxZ1tk4K5f/ybA==',
    icon: 'vi+/pehQVLQWonpFRrYOOg==',
    color: '#162425',
    description: 'E3V4wIlCDIpjL8SsHOdnlg=='
}
export const POST_TOPICS_INVALID = {
    name: 'mjfDs8+92KAjeEQdWqszNg==',
    icon: '7H+uROqo4lJIhTrDJprx/g==',
    color: 'p//HGR02dhU1Qw77eSysSQ==',
    description: 'UWDJnCUdsD367I54GuALrw=='
}
export const POST_TOPICS_MISSING = {
    icon: 'dtw9OXZpVvJk2h+xnDAu4w==',
    color: '#0024FA',
    description: 'RTFjFuOFHYIP1IAGQLBYOQ=='
}

// PATCH /topics/{topicID} patch-topics-topicID
export const PATCH_TOPICS_TOPICID_VALID = {
    name: 'xmuVk7mFu+9WoNr2lSJ7kw==',
    color: '#5182C5',
    icon: 'ofs6qAQ+O/EgTjIpZ+J/Cg==',
    description: 'kZiuHJAVrStGpE2EpoYzdg=='
}
export const PATCH_TOPICS_TOPICID_INVALID = {
    name: 'MEpKUTLjAahLXaUIUNplhw==',
    color: 'Rv110FHUjuu2VIJceZVJWw==',
    icon: '6bR0Ccaolp6Zoo+MnHdsxQ==',
    description: '22PlnH9TNH5/l0xifIIJOw=='
}

// GET /user get-user
export const GET_USER_VALID = {
    id: '2DFjUg6uGFQ1c0A8G3HVnw==',
    name: '+tZHXC7NLo73jY0sP7sCgw==',
    username: 'FNc/CrHaxFxwfSB8kfAm2g==',
    email: 'SVkEA29g6WqBFAjO9282SA==',
}
export const GET_USER_INVALID = {
    id: 'VsVU9T1Gppfy/sICOoluuw==',
    name: 'XZ6R+H0AOFLBcpEMWZQ+WQ==',
    username: 'vgaOoQvq/4nsYIAqY9VMAg==',
    email: 10,
}

// POST /user post-user
export const POST_USER_VALID = {
    name: '05C8avrTXdWW6/OGpfyBTA==',
    username: '1tMLL82SfWY+i+VfFM9E+Q==',
    email: 'mUxAnZMYTYY1M3as9liUCA==',
    hash: 'KYIUR3JOz2B1JX8w8W+l0g==',
    profile: 'ZhCShCGRreLgdn2JrVOqBA=='
}
export const POST_USER_MISSING = {
    username: 'Z/ktAB4GZ5iyYkk+KH+Wqw==',
    email: 'tkr2k0FVKUWEZdilyQoLqQ==',
    hash: 'S+NpbhKEcapFJLdtay4Tww==',
    profile: 'v8GnE4g0cH7QC85KFxaLtw=='
}

// PATCH /user/{userID} patch-user-userID
export const PATCH_USER_USERID_VALID = {
    name: 'm+u2yQj2+AdB4ajTcn4JRw==',
    username: 'IYPuLm3MYGy13mhG2YB3HA==',
    email: 'GiNn/Ucklpx6ZJXWNGLdZg==',
    hash: 'jI7vcTsgGcTXsho1V3mZYA==',
    profile: 'xBBSK/w7bYeh9cuuHrZsyg=='
}

// GET /venues get-venues
export const GET_VENUES_VALID = {
    name: 'CAX41bsP8/p2vyPJ8FWRBA==',
    capacity: '778',
    approximate_capacity: '726',
    approximate_fuzziness: '125',
    minimum_capacity: '536',
    maximum_capacity: '54'
}
export const GET_VENUES_INVALID = {
    name: 'sbahKwuUq6RdX9AZzsLQUQ==',
    capacity: 'iam91Y6X/+mJLkzG4Os43A==',
    approximate_capacity: '68',
    approximate_fuzziness: '125',
    minimum_capacity: '554',
    maximum_capacity: '170'
}

// POST /venues post-venues
export const POST_VENUES_VALID = {
    name: 'FreNzaTKA22ZBMb9aqok7g==',
    capacity: 864,
    color: '#D882A1'
}
export const POST_VENUES_INVALID = {
    name: 'ntIXhzToOWT7cM1fhfzPqQ==',
    capacity: 'sSlS39lqQKMsnpBOlZRgjw==',
    color: '#045CA2'
}
export const POST_VENUES_MISSING = {
    capacity: 695,
    color: '#FDD7D7'
}

// PATCH /venues/{venueID} patch-venues-venueID
export const PATCH_VENUES_VENUEID_VALID = {
    name: 'cn4p3gSnw9YMJi7Ftei1NA==',
    capacity: 277,
    color: '#1B8D63'
}
export const PATCH_VENUES_VENUEID_INVALID = {
    name: 'ggofpbsuTTlIjH6sZkK6ig==',
    capacity: 'NmfZGz/wdHUpk4hMYC8wSQ==',
    color: '#A00BAD'
}

