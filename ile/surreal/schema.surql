-- Ile stays marketplace — SurrealDB 3.x SCHEMAFULL
-- NIPOST National Digital Alphanumeric Postcode is mandatory on every listing.

DEFINE NAMESPACE OVERWRITE ile;
DEFINE DATABASE OVERWRITE main;
USE NS ile DB main;

DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
  SIGNUP (
    CREATE user SET
      email = $email,
      pass = crypto::argon2::generate($pass),
      name = $name,
      role = $role,
      created_at = time::now()
  )
  SIGNIN (
    SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(pass, $pass)
  )
  DURATION FOR TOKEN 7d, FOR SESSION 30d;

DEFINE TABLE OVERWRITE user SCHEMAFULL
  PERMISSIONS
    FOR select WHERE id = $auth.id OR $auth.role IN ['admin','host']
    FOR update WHERE id = $auth.id OR $auth.role = 'admin'
    FOR create NONE
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD OVERWRITE pass ON user TYPE string PERMISSIONS FOR select NONE;
DEFINE FIELD OVERWRITE name ON user TYPE string;
DEFINE FIELD OVERWRITE role ON user TYPE string ASSERT $value IN ['guest','host','admin'];
DEFINE FIELD OVERWRITE created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE user_email ON user FIELDS email UNIQUE;

DEFINE TABLE OVERWRITE host SCHEMAFULL
  PERMISSIONS
    FOR select FULL
    FOR create WHERE $auth.role IN ['host','admin']
    FOR update WHERE id = $auth.id OR $auth.role = 'admin'
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE name ON host TYPE string;
DEFINE FIELD OVERWRITE city ON host TYPE string;
DEFINE FIELD OVERWRITE state_code ON host TYPE string;
DEFINE FIELD OVERWRITE superhost ON host TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE bio ON host TYPE string;

DEFINE TABLE OVERWRITE listing SCHEMAFULL
  PERMISSIONS
    FOR select FULL
    FOR create WHERE $auth.role IN ['host','admin']
    FOR update WHERE host = $auth.id OR $auth.role = 'admin'
    FOR delete WHERE host = $auth.id OR $auth.role = 'admin';

DEFINE FIELD OVERWRITE slug ON listing TYPE string;
DEFINE FIELD OVERWRITE title ON listing TYPE string;
DEFINE FIELD OVERWRITE category ON listing TYPE string;
DEFINE FIELD OVERWRITE street_address ON listing TYPE string ASSERT string::len($value) > 3;
DEFINE FIELD OVERWRITE neighbourhood ON listing TYPE string;
DEFINE FIELD OVERWRITE city ON listing TYPE string;
DEFINE FIELD OVERWRITE state_code ON listing TYPE string ASSERT $value IN [
  'AB','AD','AK','AN','BA','BY','BE','BR','CR','DE','EB','ED','EK','EN','FC','GM','IM','JI',
  'KD','KN','KT','KE','KG','KW','LA','NA','NI','OG','ON','OS','OY','PL','RI','SK','TA','YB','ZA'
];
DEFINE FIELD OVERWRITE state_name ON listing TYPE string;
-- Compact 11-char NIPOST code: SS + LGA(01-99) + District(A00-style) + Area(AA) + Building(01-99)
DEFINE FIELD OVERWRITE postal_code ON listing TYPE string
  ASSERT string::len($value) = 11
  AND string::is::alphanum($value)
  AND $value = string::uppercase($value)
  AND string::slice($value, 0, 2) IN [
    'AB','AD','AK','AN','BA','BY','BE','BR','CR','DE','EB','ED','EK','EN','FC','GM','IM','JI',
    'KD','KN','KT','KE','KG','KW','LA','NA','NI','OG','ON','OS','OY','PL','RI','SK','TA','YB','ZA'
  ];
DEFINE FIELD OVERWRITE postal_display ON listing TYPE string;
DEFINE FIELD OVERWRITE lat ON listing TYPE float;
DEFINE FIELD OVERWRITE lng ON listing TYPE float;
DEFINE FIELD OVERWRITE price_per_night_ngn ON listing TYPE number ASSERT $value > 0;
DEFINE FIELD OVERWRITE cleaning_fee_ngn ON listing TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE service_fee_ngn ON listing TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE rating ON listing TYPE float DEFAULT 0;
DEFINE FIELD OVERWRITE review_count ON listing TYPE int DEFAULT 0;
DEFINE FIELD OVERWRITE guest_favorite ON listing TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE beds ON listing TYPE int;
DEFINE FIELD OVERWRITE baths ON listing TYPE int;
DEFINE FIELD OVERWRITE guests ON listing TYPE int;
DEFINE FIELD OVERWRITE images ON listing TYPE array<string>;
DEFINE FIELD OVERWRITE amenities ON listing TYPE array<string>;
DEFINE FIELD OVERWRITE description ON listing TYPE string;
DEFINE FIELD OVERWRITE host ON listing TYPE record<host>;
DEFINE FIELD OVERWRITE status ON listing TYPE string DEFAULT 'live'
  ASSERT $value IN ['live','paused','rejected'];
-- Reject listings that somehow lack postcode at write time (app + EVENT)
DEFINE FIELD OVERWRITE created_at ON listing TYPE datetime DEFAULT time::now();
DEFINE FIELD OVERWRITE nightly_all_in_preview ON listing COMPUTED
  price_per_night_ngn + math::round(cleaning_fee_ngn / 3) + service_fee_ngn;

DEFINE INDEX OVERWRITE listing_slug ON listing FIELDS slug UNIQUE;
DEFINE INDEX OVERWRITE listing_postal ON listing FIELDS postal_code UNIQUE;
DEFINE INDEX OVERWRITE listing_state ON listing FIELDS state_code;
DEFINE INDEX OVERWRITE listing_city ON listing FIELDS city;

DEFINE EVENT OVERWRITE reject_invalid_postal ON listing WHEN $event = "CREATE" OR $event = "UPDATE" THEN {
  IF postal_code IS NONE OR string::len(postal_code) != 11 {
    THROW "Ile rejects listings without a valid 11-character NIPOST postal_code";
  };
};

DEFINE TABLE OVERWRITE booking SCHEMAFULL
  PERMISSIONS
    FOR select WHERE guest = $auth.id OR $auth.role = 'admin'
    FOR create WHERE $auth != NONE
    FOR update WHERE guest = $auth.id OR $auth.role = 'admin'
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE listing ON booking TYPE record<listing>;
DEFINE FIELD OVERWRITE guest ON booking TYPE record<user>;
DEFINE FIELD OVERWRITE check_in ON booking TYPE datetime;
DEFINE FIELD OVERWRITE check_out ON booking TYPE datetime;
DEFINE FIELD OVERWRITE guests ON booking TYPE int;
DEFINE FIELD OVERWRITE total_ngn ON booking TYPE number;
DEFINE FIELD OVERWRITE fee_lines ON booking TYPE array<object> DEFAULT [];
DEFINE FIELD OVERWRITE stacked_agent_fee_ngn ON booking TYPE number DEFAULT 0
  ASSERT $value = 0;
DEFINE FIELD OVERWRITE status ON booking TYPE string DEFAULT 'requested';
DEFINE FIELD OVERWRITE created_at ON booking TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE wishlist SCHEMAFULL
  PERMISSIONS
    FOR select WHERE owner = $auth.id
    FOR create WHERE $auth != NONE
    FOR update WHERE owner = $auth.id
    FOR delete WHERE owner = $auth.id;

DEFINE FIELD OVERWRITE owner ON wishlist TYPE record<user>;
DEFINE FIELD OVERWRITE name ON wishlist TYPE string DEFAULT 'Saved';
DEFINE FIELD OVERWRITE listing_ids ON wishlist TYPE array<record<listing>> DEFAULT [];
