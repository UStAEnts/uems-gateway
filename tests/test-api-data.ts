import { Request } from "express";

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
    name: 'e8u9fDJBU3lR2ofEf+P1/Q==',
    icon: 'iSk5WvDn6Aogpd44FbzWwg==',
    color: '#68D195',
    id: 'OurMP0gYImpGmXklRsXkog=='
}
export const GET_ENTS_INVALID = {
    name: '/D7oatpTB/fIg3HNfCyPzw==',
    icon: 'b1jRsBPMOCEl6MwHcFfHrA==',
    color: 'kjkEXqZ+2LScQWKVYRgOTA==',
    id: 'RtEkE3BEgxmEAxDU2uaSiA=='
}

// POST /ents post-ents
export const POST_ENTS_VALID = {
    name: 'rVYZAli4rWj3MYvjqaaA9Q==',
    icon: 'TBHanDjcvlZ7wUX8h144iw==',
    color: '#22402F'
}
export const POST_ENTS_INVALID = {
    name: 'l0qZdjwcH2+BRBPP4B0UFg==',
    icon: 214,
    color: '#1EF013'
}
export const POST_ENTS_MISSING = {
    icon: 'BJUqU012MZz8tR94TL2h8w==',
    color: '#BAA6B9'
}

// GET /ents/{entID} get-ents-entID
export const GET_ENTS_ENTID_VALID = {}
export const GET_ENTS_ENTID_INVALID = {}

// PATCH /ents/{entID} patch-ents-entID
export const PATCH_ENTS_ENTID_VALID = {
    name: 'Tj8aqjYq/tU3QfYIA51k4Q==',
    icon: 'JudJxb2gEFye2LRYGn+EHw==',
    color: '#AE6615'
}
export const PATCH_ENTS_ENTID_INVALID = {
    name: 902,
    icon: 'hBWuqvZAIl9X56Q4f0Us4Q==',
    color: '#091B1D'
}

// GET /equipment get-equipment
export const GET_EQUIPMENT_VALID = {
    id: 'HyA0t4imeyLh8QqrxAtCWQ==',
    assetID: 'K8WyMGy6Ml9zgGg42L6YGg==',
    name: '/G81yVtvsMvCOdr+DwFzjA==',
    manufacturer: 'BggWllSeffgiRHdhiyq1Ig==',
    model: 'WuXPKJ8OvJE6HRheZWP7dA==',
    miscIdentifier: 'AFrqbngkqrT2IRYN7sN44A==',
    amount: 775,
    locationID: 'OO0adgD2ngx0tt6MgHyqYQ==',
    locationSpecifier: '2F/RbkKqnT/OoZtm48raNQ==',
    managerID: 'Ai4mM+0tMBf/R3KlRPCaXA==',
    date: 609,
    category: '/fmiGNV5n8786NsF/jheqA=='
}
export const GET_EQUIPMENT_INVALID = {
    id: 'o1xEItoE8NGHBHkwkqLsbA==',
    assetID: 'j00y6y696KKwFyPDwjISuA==',
    name: '8CKY3nNOdW1di2VbhMu3Zg==',
    manufacturer: 'iNpM5oP0e2ejJkXOA256ag==',
    model: 'Rh5+41YwmsYque88RvP+2Q==',
    miscIdentifier: 'TBZFDe5KUuVCX3u+Ll+eiw==',
    amount: 638,
    locationID: 'YV2iaeXFblE110W4VPprFw==',
    locationSpecifier: 281,
    managerID: 'aL93VKtDU8aFSm0qEureIg==',
    date: 802,
    category: 'VQz0LZ/28t1ub8PFMGM8dg=='
}

// POST /equipment post-equipment
export const POST_EQUIPMENT_VALID = {
    name: 'RjeVhfgeNRR66RYPAnZiIQ==',
    manufacturer: 'NNpKEEohe77t85r2kRgMoA==',
    model: 'PQYryYsaGZRx1MrRHxvjVw==',
    amount: 876,
    locationID: 'cf01ihPXztFju/fGKZ/pBQ==',
    category: 'USKoSGbj84EhtT7nl+9JhQ==',
    assetID: 'pOzUXy2Yd1EX4wSTsTj4dQ==',
    miscIdentifier: 'C+/DfOf1zsRSNG/GsH8UqA==',
    locationSpecifier: 'kJgKYchPzdVphMjvv+c8Fw=='
}
export const POST_EQUIPMENT_INVALID = {
    name: 'H34Kzb0/19YQl0b4vqqyBg==',
    manufacturer: 471,
    model: 'DXTwLcZqt8F5nNdjYLGL3A==',
    amount: 721,
    locationID: 'b/mPejA8MPC+dSeXsnTEKA==',
    category: 'zKQCJJZk6lMuhJ3hI3sw6w==',
    assetID: 'kK/VFyXupIa2zETyRBdhJw==',
    miscIdentifier: 'RPDLHK10aRt0xW7EwralFg==',
    locationSpecifier: 'wxTq0MU1/WIx/TK41dfwOg=='
}
export const POST_EQUIPMENT_MISSING = {
    manufacturer: 'T2l8oxHX3XtLxzJsujeRQw==',
    model: 'xao5/kQqIQrdVlqMD6m1iw==',
    amount: 600,
    locationID: 'XyQGS8cexD0Ms31IIYzz/g==',
    category: 'iqLOSeodUx3CJnzgwlBuGw==',
    assetID: 'pFrKgh7PxWfQv+skY84Jhg==',
    miscIdentifier: 'ZCE0E1VJK+7tD+yS1mvYdQ==',
    locationSpecifier: 'SVbrW7JgYvX8N1IrzJjLjg=='
}

// PATCH /equipment/{equipmentID} patch-equipment-equipmentID
export const PATCH_EQUIPMENT_EQUIPMENTID_VALID = {
    assetID: '0aLpUO1/44II5yNTKu9pag==',
    name: 'mTX5mf6uU6ANGkdGOf5GiQ==',
    manufacturer: 'VCrM7T6FQm3DBlOEC2C9FA==',
    model: 'vEuzOuvwN14H901kl/gtrA==',
    miscIdentifier: 'AdS3ksyVpAUxxLNPEK547w==',
    amount: 777,
    locationID: 'Jzihv/rM0+mYkUciVpcC+Q==',
    locationSpecifier: '9xc0oCNYyG1W53Hb9REE8g==',
    managerID: '+3/mSbmB00d1gilcEzGFxA==',
    category: 'AsgZeryA4oONdz+6s2WMyA=='
}
export const PATCH_EQUIPMENT_EQUIPMENTID_INVALID = {
    assetID: 'CdhKk8Kflq1x6u6eJnLJ6Q==',
    name: 'ncohrqTtQJLTCwJmXbDvYw==',
    manufacturer: '5QWTLtUc6xJMoQxN/1dcow==',
    model: 'YU5ezvdZOAmewRMmqPtzGg==',
    miscIdentifier: '9UHIrJ0847hof8UH9cJn/w==',
    amount: 589,
    locationID: '+Ds4mI4k3ioQUhZvko/OIw==',
    locationSpecifier: 'c6XRyzGHGyCd3PZtHKa9wQ==',
    managerID: '61a4mrDs6NhVa6owx8+G4A==',
    category: 655
}

// GET /events get-events
export const GET_EVENTS_VALID = {
    name: 'LHKHyrXxKxh69e/xLHm8eQ==',
    start: 500,
    end: 999,
    attendance: 715,
    venueIDs: 'GM7ZeKLMm8GtD5GqfirP6w==',
    venueCriteria: 'WYx2pFaqnJh4bzcy1c7ZUg==',
    entsID: 'GaiMC14M1LuC8wUHAGOskA==',
    stateID: 'sllh0OENX5jOWQfMpiUAoQ==',
    startafter: 43,
    startbefore: 29,
    endafter: 862,
    endbefore: 176,
    attendanceGreater: 546,
    attendanceLess: 481
}
export const GET_EVENTS_INVALID = {
    name: 'p1PE1/Y7W5gQ0FEJ/6Hbeg==',
    start: 63,
    end: 858,
    attendance: 366,
    venueIDs: 'XQbhUcawu1Q2ZtBE7pF6/A==',
    venueCriteria: 'frLkK0ZJ6/Rx+Pr4+LG+6A==',
    entsID: 'y93ZlQfMNt0t9EAAOIDyKA==',
    stateID: '+fTyPnB6+Oa/LmKaqOQwnw==',
    startafter: 277,
    startbefore: 764,
    endafter: 'd0xzEoukjOPE73qijuoqLA==',
    endbefore: 185,
    attendanceGreater: 288,
    attendanceLess: 82
}

// POST /events post-events
export const POST_EVENTS_VALID = {
    name: 'Md8/LWd8EoW5AWLWpv9vqg==',
    venue: '5ptjvuawi5CPFBnpWLQs6g==',
    start: 670,
    end: 29,
    attendance: 380,
    state: 'tFDtpO7RjcsANfMuvk3VFg==',
    ents: 'fBa7y8V4XSzLe6Elc08GiA=='
}
export const POST_EVENTS_INVALID = {
    name: '50IOnLRGxxB7XprhKj0mhA==',
    venue: '+O3HFSMfukZKy9k1wohxbA==',
    start: '4V0MsgHteAzzJC4PaG64dw==',
    end: 809,
    attendance: 501,
    state: 'Ba0OTp/3SzRfLpTdCRPufg==',
    ents: 'RY9jb3K+Q0ndVOBl96f4ng=='
}
export const POST_EVENTS_MISSING = {
    venue: 'DSe8sghByNp4p3/m5pQzVg==',
    start: 880,
    end: 90,
    attendance: 690,
    state: 'BYG0CYXG1YuEmPPD/aIz8w==',
    ents: 'snPUC7tAPhMlNTfFdQDJ1g=='
}

// PATCH /events/{eventID} patch-events-eventID
export const PATCH_EVENTS_EVENTID_VALID = {
    name: 'PH4HOIkLb0qv2W4oNFxo2A==',
    start: 482,
    end: 953,
    attendance: 211,
    addVenues: null,
    removeVenues: null,
    ents: 'BweS2n7KuljXBsqVnJlwWg==',
    state: 'LF+eKclezzv5DcwHlEFEQQ=='
}
export const PATCH_EVENTS_EVENTID_INVALID = {
    name: 'm7S539Q155vIUNWfy+A+9g==',
    start: 125,
    end: 881,
    attendance: 427,
    addVenues: null,
    removeVenues: null,
    ents: 'cDvZ7AP7c/QxatNBSkPPxg==',
    state: 'J4GuLGCm7d07L5rE1BGwYw=='
}

// POST /events/{eventID}/comments post-events-eventID-comments
export const POST_EVENTS_EVENTID_COMMENTS_VALID = {
    category: 'Z9+0zrsEBfUyloGFMAKzag==',
    requiresAttention: true,
    body: 'nXXqerPNDVrcM8V06nzirg=='
}
export const POST_EVENTS_EVENTID_COMMENTS_INVALID = {
    category: 'pts7EALQa4SoBZCoXFLVEA==',
    requiresAttention: true,
    body: 611
}
export const POST_EVENTS_EVENTID_COMMENTS_MISSING = {
    category: 'vFk554YSCmMu6D8cTLfiSw==',
    requiresAttention: true
}

// GET /files get-files
export const GET_FILES_VALID = {
    id: '1viHKI4jIVrP6KudDogwoQ==',
    name: 'Z04flw0823O7d5iGyjjC5A==',
    filename: '4sFbGEBdijM0foazETOfYQ==',
    size: 990,
    type: 'ZavBX+G5scNJvgTO+LhV7w==',
    date: 98,
    userid: 'lIR03sGGSzRT99ZxtkGj6Q=='
}
export const GET_FILES_INVALID = {
    id: '84K8F7D0PZF29qXdnc+aug==',
    name: 'h7vnbq2n4upQsEUsfVor7w==',
    filename: 'dOwy1t3CLZksagOG5rYFTA==',
    size: 886,
    type: 'rj5aCWjQ2TDZJJC5UoHRfg==',
    date: 'KVa9ehXptOVmP80hkn4MRw==',
    userid: 'MY9oWPCoEqdxBbzeJmfopg=='
}

// POST /files post-files
export const POST_FILES_VALID = {
    name: '43+lea0eYh5ZeUKYVNVYRA==',
    filename: 'JOl/2CyINb3jUbAr69gjmg==',
    size: 911,
    type: 'OJ7gS9Lo6520cusj5zBVBA=='
}
export const POST_FILES_INVALID = {
    name: 'ARb4cWYDXM4o5UyON/U2Wg==',
    filename: 'NpF3GbyGA3yHHUA5EYDklQ==',
    size: '29DAPV3rGrUv2ItF8LXxyA==',
    type: 'hikTwzjKD0D1G06ReHfdnQ=='
}
export const POST_FILES_MISSING = {
    filename: 'w3/PUtuU06NGkRASmdb/1g==',
    size: 564,
    type: 'AYqDfSv0HcLGRCEe2zFpZw=='
}

// PATCH /files/{fileID} patch-files-fileID
export const PATCH_FILES_FILEID_VALID = {
    name: '9tBM5TqAJagZQHi9jEcU1A==',
    type: 'x2Mql8MoL5wiUc0JZNzA0A=='
}
export const PATCH_FILES_FILEID_INVALID = {
    name: 704,
    type: 'Dj3qvxYaog2TM9Gpmt43kQ=='
}

// POST /events/{eventID}/files post-events-eventID-files
export const POST_EVENTS_EVENTID_FILES_VALID = { fileID: 'AZz3fkzWn1q7UWJAjdAI/w==' }
export const POST_EVENTS_EVENTID_FILES_INVALID = { fileID: 799 }
export const POST_EVENTS_EVENTID_FILES_MISSING = {}

// GET /events/{eventID}/signups get-events-eventID-signups
export const GET_EVENTS_EVENTID_SIGNUPS_VALID = {
    id: 'QDGk/E51IzOZHTzGc32mOA==',
    date: 374,
    userid: 'wEuaXYFwFa4/1qlM47EWMQ==',
    dateRangeBegin: 783,
    dateRangeEnd: 102,
    role: 'mQRpQ/wwK0aoYENUyqBQxA=='
}
export const GET_EVENTS_EVENTID_SIGNUPS_INVALID = {
    id: 'DXnR/wdGnddAqBZYonGyeA==',
    date: 290,
    userid: 'qUOL2k46sXFj5gPc8xZgFQ==',
    dateRangeBegin: 'UtKnv7i/SdGpsvU1Tfdszw==',
    dateRangeEnd: 177,
    role: '6rh78cXak7Q9tBCg69axnQ=='
}

// POST /events/{eventID}/signups post-events-eventID-signups
export const POST_EVENTS_EVENTID_SIGNUPS_VALID = { role: 'iudzRDsLTFDpMZ42H1mV4A==' }
export const POST_EVENTS_EVENTID_SIGNUPS_INVALID = { role: 837 }
export const POST_EVENTS_EVENTID_SIGNUPS_MISSING = {}

// PATCH /events/{eventID}/signups/{signupID} patch-events-eventID-signups-signupID
export const PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_VALID = { role: '7KdV2XtIkaFVD52luPJQVA==' }
export const PATCH_EVENTS_EVENTID_SIGNUPS_SIGNUPID_INVALID = { role: 622 }

// GET /states get-states
export const GET_STATES_VALID = {
    name: 'znJf/AXnCM3K14zloOG7mw==',
    icon: 'LF13m7ey2CbVo1XI44uBvQ==',
    color: '#0E1EF2',
    id: 'df/YxwKlXcTfjzisqLBpCw=='
}
export const GET_STATES_INVALID = {
    name: 'am3KylLZoawJD/PWYnH2gA==',
    icon: '2cXMB2lx+gIVmtch/7q2Dw==',
    color: '#81FA01',
    id: 897
}

// POST /states post-states
export const POST_STATES_VALID = {
    name: 'wq94rFM1G/ssF0uInAawYg==',
    icon: 'xE8VcHaR0dqw0cD++DNV/g==',
    color: '#BE68B3'
}
export const POST_STATES_INVALID = {
    name: 'WHB9dCZSi9rDWRbUIQjdqQ==',
    icon: 'K9oQXptgW2+7unV9RGNgoQ==',
    color: 'V3+2rFFT6a8G3NJk0oEkSA=='
}
export const POST_STATES_MISSING = {
    icon: 'o4Fau1F5+QeHl9nQ1QE59A==',
    color: '#BF78D9'
}

// PATCH /states/{stateID} patch-states-stateID
export const PATCH_STATES_STATEID_VALID = {
    name: 'IWDb5haYvvtiirrOLoR8Yw==',
    icon: 'BdBYq7Xv3lqzTKYFdpUKBw==',
    color: '#09C296'
}
export const PATCH_STATES_STATEID_INVALID = {
    name: 't/tYsYEWo8fKikOhHMmZHg==',
    icon: 180,
    color: '#72CC0D'
}

// GET /topics get-topics
export const GET_TOPICS_VALID = {
    name: 'JpqnBJRkpyhWc2JrEeP8gg==',
    icon: 'cWPf4WN9+/B87CDgXxaeUQ==',
    color: '#174A35',
    id: '9cvhADLpsnweow8tSlZWhg==',
    description: '0StMfM2/Fd7rDWcXP7yLNw=='
}
export const GET_TOPICS_INVALID = {
    name: '0HlTRKU1VNxTIKLmGSBYzw==',
    icon: 361,
    color: '#4CEE37',
    id: 'QIKfSKPgYEdzfAx7gjtKkg==',
    description: 'kZBji/KaEZVZuXehUA+vZw=='
}

// POST /topics post-topics
export const POST_TOPICS_VALID = {
    name: '54SftH4AK6xUuSVekjTuCg==',
    icon: 'AmEeGXa4ugBWVAoMnJMFUw==',
    color: '#8C0B93',
    description: '42vBwJZO5GPrLDQiHlBQyQ=='
}
export const POST_TOPICS_INVALID = {
    name: 'w+7ps+UFrcmYU3fKMRl6vg==',
    icon: 'qGxPHwwNqmUBcGR5fH98Gg==',
    color: 'je7fEBG/1MHqv++d3ih3PA==',
    description: '2JXIxPnN5Z/upH8ncxJECg=='
}
export const POST_TOPICS_MISSING = {
    icon: 'EWIZ4rD5EeWIuk1G7B4cXQ==',
    color: '#28581E',
    description: 'Ss2kf3n/9rN+0ejt4q2s6w=='
}

// PATCH /topics/{topicID} patch-topics-topicID
export const PATCH_TOPICS_TOPICID_VALID = {
    name: 'ZQKAx+ls2SIieCszZXFbGQ==',
    color: '#350840',
    icon: 'qEcFdL16m3mi/3VeUmiXbw==',
    description: 'gliP7YyN/J4eTHgw36HdGw=='
}
export const PATCH_TOPICS_TOPICID_INVALID = {
    name: '4v1QK6utzI7hr4h3jDIMDQ==',
    color: '#68037E',
    icon: 656,
    description: '9bp2euoQRTYfvw4OktLmJw=='
}

// GET /user get-user
export const GET_USER_VALID = {
    id: 'gDniJ+HoYWCMyFEAI2Disw==',
    name: 'islFLeQHH8yWuwxZENj0wg==',
    username: 'L4U0gCwN4K+WHUiTNG9Rvw==',
    email: 'pF5vyVCBjH5zwYE6aa4zag==',
    includeEmail: true,
    includeHash: false
}
export const GET_USER_INVALID = {
    id: 399,
    name: 'cqqOPEWgNs90KO+AnDx+/w==',
    username: 'dSq2gdP2jHWUfPK9aRA2vg==',
    email: 'ECqQ9aobbdYnNTy54r8Yxg==',
    includeEmail: false,
    includeHash: false
}

// POST /user post-user
export const POST_USER_VALID = {
    name: 'fvKZwBJGm3t5fIacetTHCg==',
    username: 'GQ7CsLFhIqn79cArz3jWBA==',
    email: 'Ek0O6C3TaszjtM0d+SQmtA==',
    hash: 'JQaOfxoEiilBL4sPtA8hJw==',
    profile: 'Y7t9HwagBRQ3hYnNENDp7A=='
}
export const POST_USER_INVALID = {
    name: 'Yly5ferwyfM/cZ4zlCO2Kw==',
    username: '3KSWrAt3T85b0MtJl84/sw==',
    email: 235,
    hash: 'WPT35ty/5asgGDJlwav/PA==',
    profile: 'hje1o+KkW2GikU29F7/NGg=='
}
export const POST_USER_MISSING = {
    username: 'W1TQZjlq9Xf7Zxn3jek2Iw==',
    email: 'suSeMIl2hBjTskCt/Q2Gpg==',
    hash: '5SbJmfxdZmqV6l+rQbZqgw==',
    profile: '4mnmkDR9ohWLl2Ln5IrqOA=='
}

// PATCH /user/{userID} patch-user-userID
export const PATCH_USER_USERID_VALID = {
    name: 'Qr8fXiJkhFmgmIijP8e6Pw==',
    username: 'w8uUXhTi8VXoH2v1NrHTvQ==',
    email: 'ZNYp2EsRPZo6+tPd/Winjw==',
    hash: 'Ex5bBLgLoXD+Rbx+4w5g9Q==',
    profile: '9RJP6hMbq8jddsbFfbf60g=='
}
export const PATCH_USER_USERID_INVALID = {
    name: '79HOLj769oKikXFl0yX95A==',
    username: 'ziUvmwgvwkmUHOsdnArrCw==',
    email: 'jrRojLwn3vCT01sOKQSClQ==',
    hash: 604,
    profile: 'fauIsaRj+wi5LdMp3gwMnA=='
}

// GET /venues get-venues
export const GET_VENUES_VALID = {
    name: 'Z0d0l7Pvg8mujO05RgmsSw==',
    capacity: 982,
    approximate_capacity: 385,
    approximate_fuzziness: 963,
    minimum_capacity: 953,
    maximum_capacity: 34
}
export const GET_VENUES_INVALID = {
    name: 923,
    capacity: 999,
    approximate_capacity: 213,
    approximate_fuzziness: 167,
    minimum_capacity: 224,
    maximum_capacity: 117
}

// POST /venues post-venues
export const POST_VENUES_VALID = {
    name: 'U8yHvLN2Gd/46lGbq5Sz6g==',
    capacity: 532,
    color: '#6072DC'
}
export const POST_VENUES_INVALID = {
    name: 'sjkTcwUaVLoRc1Cyf2dNFA==',
    capacity: 'nfUD+YvtnjbkA/WOCRh+yA==',
    color: '#79E6C0'
}
export const POST_VENUES_MISSING = {
    capacity: 552,
    color: '#C1E93E'
}

// PATCH /venues/{venueID} patch-venues-venueID
export const PATCH_VENUES_VENUEID_VALID = {
    name: 'lYdOz+sdrDa3fjbakWIulQ==',
    capacity: 307,
    color: '#6CB3F9'
}
export const PATCH_VENUES_VENUEID_INVALID = {
    name: 'tGd7ENroUqfm3+LrdcKMyA==',
    capacity: 'F+uULot1DQxYC3aK1CAnGw==',
    color: '#D40408'
}

