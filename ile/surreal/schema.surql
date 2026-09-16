-- Ile — SurrealDB 3.x schema (SCHEMAFULL + PERMISSIONS + ACCESS + COMPUTED)
-- Target: SurrealDB Cloud or local surreal start --user root --pass root
-- NS/DB: ile / main

DEFINE NAMESPACE OVERWRITE ile;
DEFINE DATABASE OVERWRITE main;

USE NS ile DB main;

-- Auth (email/password record access) — wire secrets via Surreal Cloud, not git
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
    FOR select WHERE id = $auth.id OR $auth.role = 'admin'
    FOR update WHERE id = $auth.id OR $auth.role = 'admin'
    FOR create NONE
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD OVERWRITE pass ON user TYPE string PERMISSIONS FOR select NONE;
DEFINE FIELD OVERWRITE name ON user TYPE string;
DEFINE FIELD OVERWRITE handle ON user TYPE option<string>;
DEFINE FIELD OVERWRITE role ON user TYPE string ASSERT $value IN ['buyer','seller','landlord','tenant','agent','lawyer','admin'];
DEFINE FIELD OVERWRITE city ON user TYPE option<string>;
DEFINE FIELD OVERWRITE bio ON user TYPE option<string>;
DEFINE FIELD OVERWRITE verified ON user TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE user_email ON user FIELDS email UNIQUE;

DEFINE TABLE OVERWRITE listing SCHEMAFULL
  PERMISSIONS
    FOR select FULL
    FOR create WHERE $auth.role IN ['agent','seller','landlord','admin']
    FOR update WHERE agent = $auth.id OR $auth.role = 'admin'
    FOR delete WHERE agent = $auth.id OR $auth.role = 'admin';

DEFINE FIELD OVERWRITE slug ON listing TYPE string;
DEFINE FIELD OVERWRITE title ON listing TYPE string;
DEFINE FIELD OVERWRITE kind ON listing TYPE string ASSERT $value IN ['sale','rent','shortlet','land'];
DEFINE FIELD OVERWRITE price_ngn ON listing TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE city ON listing TYPE string;
DEFINE FIELD OVERWRITE area ON listing TYPE string;
DEFINE FIELD OVERWRITE state ON listing TYPE string;
DEFINE FIELD OVERWRITE beds ON listing TYPE option<number>;
DEFINE FIELD OVERWRITE baths ON listing TYPE option<number>;
DEFINE FIELD OVERWRITE sqm ON listing TYPE option<number>;
DEFINE FIELD OVERWRITE image ON listing TYPE option<string>;
DEFINE FIELD OVERWRITE blurb ON listing TYPE string;
DEFINE FIELD OVERWRITE agent ON listing TYPE record<user>;
DEFINE FIELD OVERWRITE agent_fee_percent ON listing TYPE number ASSERT $value >= 0 AND $value <= 20;
DEFINE FIELD OVERWRITE lawyer_fee_suggested_ngn ON listing TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE status ON listing TYPE string DEFAULT 'live' ASSERT $value IN ['live','under_offer','closed'];
DEFINE FIELD OVERWRITE created_at ON listing TYPE datetime DEFAULT time::now();
DEFINE FIELD OVERWRITE fee_preview_ngn ON listing COMPUTED math::round(price_ngn * agent_fee_percent / 100) + lawyer_fee_suggested_ngn;
DEFINE INDEX OVERWRITE listing_slug ON listing FIELDS slug UNIQUE;
DEFINE INDEX OVERWRITE listing_city_kind ON listing FIELDS city, kind;

DEFINE TABLE OVERWRITE deal SCHEMAFULL
  PERMISSIONS
    FOR select WHERE buyer = $auth.id OR seller = $auth.id OR agent = $auth.id OR lawyer = $auth.id OR $auth.role = 'admin'
    FOR create WHERE $auth != NONE
    FOR update WHERE buyer = $auth.id OR agent = $auth.id OR lawyer = $auth.id OR $auth.role = 'admin'
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE listing ON deal TYPE record<listing>;
DEFINE FIELD OVERWRITE stage ON deal TYPE string DEFAULT 'inquiry'
  ASSERT $value IN ['inquiry','viewing','offer','docs','closing','done'];
DEFINE FIELD OVERWRITE buyer ON deal TYPE record<user>;
DEFINE FIELD OVERWRITE seller ON deal TYPE option<record<user>>;
DEFINE FIELD OVERWRITE agent ON deal TYPE option<record<user>>;
DEFINE FIELD OVERWRITE lawyer ON deal TYPE option<record<user>>;
DEFINE FIELD OVERWRITE deal_value_ngn ON deal TYPE number;
DEFINE FIELD OVERWRITE fee_lines ON deal TYPE array<object> DEFAULT [];
DEFINE FIELD OVERWRITE total_fees_ngn ON deal COMPUTED
  fee_lines.fold(0, |$acc, $line| $acc + $line.amount_ngn);
DEFINE FIELD OVERWRITE stacked_agent_risk ON deal TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE updated_at ON deal TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE TABLE OVERWRITE thread SCHEMAFULL
  PERMISSIONS
    FOR select WHERE $auth.id IN participants OR $auth.role = 'admin'
    FOR create WHERE $auth != NONE
    FOR update WHERE $auth.id IN participants OR $auth.role = 'admin'
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE title ON thread TYPE string;
DEFINE FIELD OVERWRITE participants ON thread TYPE array<record<user>>;
DEFINE FIELD OVERWRITE deal ON thread TYPE option<record<deal>>;
DEFINE FIELD OVERWRITE last_preview ON thread TYPE option<string>;
DEFINE FIELD OVERWRITE updated_at ON thread TYPE datetime DEFAULT time::now() VALUE time::now();

DEFINE TABLE OVERWRITE message SCHEMAFULL
  PERMISSIONS
    FOR select WHERE $auth.id IN thread.participants OR $auth.role = 'admin'
    FOR create WHERE $auth.id IN thread.participants
    FOR update NONE
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE thread ON message TYPE record<thread>;
DEFINE FIELD OVERWRITE author ON message TYPE record<user>;
DEFINE FIELD OVERWRITE body ON message TYPE string;
DEFINE FIELD OVERWRITE created_at ON message TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE fee_event SCHEMAFULL
  PERMISSIONS
    FOR select WHERE $auth != NONE
    FOR create WHERE $auth != NONE
    FOR update NONE
    FOR delete WHERE $auth.role = 'admin';

DEFINE FIELD OVERWRITE deal ON fee_event TYPE record<deal>;
DEFINE FIELD OVERWRITE kind ON fee_event TYPE string;
DEFINE FIELD OVERWRITE payload ON fee_event TYPE object;
DEFINE FIELD OVERWRITE created_at ON fee_event TYPE datetime DEFAULT time::now();
