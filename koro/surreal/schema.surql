-- Koro social logistics. SurrealDB 3.x SCHEMAFULL.
-- Seed mode applies this file with the JS SDK against local memory.
-- No cloud credential lives in this file.
--
-- Permissions are open so the localhost demo can write without a token.
-- Before a public deployment, tighten every table to $auth and issue
-- record tokens through the `account` access below.
-- A locked deal cannot change its price lines. hidden_fee_ngn cannot leave 0.

DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
  SIGNUP (
    CREATE person SET
      handle = $handle,
      name = $name,
      role = $role,
      pass = crypto::argon2::generate($pass),
      created_at = time::now()
  )
  SIGNIN (
    SELECT * FROM person WHERE handle = $handle AND crypto::argon2::compare(pass, $pass)
  )
  DURATION FOR TOKEN 7d, FOR SESSION 12h;

DEFINE TABLE OVERWRITE person SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE handle ON person TYPE string;
DEFINE FIELD OVERWRITE name ON person TYPE string;
DEFINE FIELD OVERWRITE role ON person TYPE string ASSERT $value IN ['sender', 'rider', 'shop', 'market', 'hub'];
DEFINE FIELD OVERWRITE bio ON person TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE city ON person TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE state_code ON person TYPE string ASSERT $value IN ['AB','AD','AK','AN','BA','BY','BE','BR','CR','DE','EB','ED','EK','EN','FC','GM','IM','JI','KD','KN','KT','KE','KG','KW','LA','NA','NI','OG','ON','OS','OY','PL','RI','SK','TA','YB','ZA'];
DEFINE FIELD OVERWRITE postal_code ON person TYPE string ASSERT string::matches($value, "^(AB|AD|AK|AN|BA|BY|BE|BR|CR|DE|EB|ED|EK|EN|FC|GM|IM|JI|KD|KN|KT|KE|KG|KW|LA|NA|NI|OG|ON|OS|OY|PL|RI|SK|TA|YB|ZA)(0[1-9]|[1-9][0-9])[A-Z][0-9]{2}[A-Z]{2}(0[1-9]|[1-9][0-9])$");
DEFINE FIELD OVERWRITE drops_completed ON person TYPE int DEFAULT 0;
DEFINE FIELD OVERWRITE drops_on_time ON person TYPE int DEFAULT 0;
DEFINE FIELD OVERWRITE on_time_rate ON person COMPUTED IF drops_completed = 0 THEN 0 ELSE math::round((drops_on_time * 1000) / drops_completed) / 10 END;
DEFINE FIELD OVERWRITE disputes ON person TYPE int DEFAULT 0;
DEFINE FIELD OVERWRITE corridor_from ON person TYPE option<string>;
DEFINE FIELD OVERWRITE corridor_to ON person TYPE option<string>;
DEFINE FIELD OVERWRITE spare_kg ON person TYPE option<number>;
DEFINE FIELD OVERWRITE leaves ON person TYPE option<string>;
DEFINE FIELD OVERWRITE pass ON person TYPE option<string> PERMISSIONS FOR select NONE;
DEFINE FIELD OVERWRITE created_at ON person TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE person_handle ON person FIELDS handle UNIQUE;

DEFINE TABLE OVERWRITE follow SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE follower ON follow TYPE record<person>;
DEFINE FIELD OVERWRITE followee ON follow TYPE record<person>;
DEFINE INDEX OVERWRITE follow_pair ON follow FIELDS follower, followee UNIQUE;

DEFINE TABLE OVERWRITE shipment SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE author ON shipment TYPE record<person>;
DEFINE FIELD OVERWRITE rider ON shipment TYPE option<record<person>>;
DEFINE FIELD OVERWRITE status ON shipment TYPE string ASSERT $value IN ['open', 'claimed', 'locked', 'moving', 'delivered', 'disputed'];
DEFINE FIELD OVERWRITE goods ON shipment TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE detail ON shipment TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE weight_kg ON shipment TYPE number ASSERT $value > 0 AND $value <= 200;
DEFINE FIELD OVERWRITE origin_postal ON shipment TYPE string ASSERT string::matches($value, "^(AB|AD|AK|AN|BA|BY|BE|BR|CR|DE|EB|ED|EK|EN|FC|GM|IM|JI|KD|KN|KT|KE|KG|KW|LA|NA|NI|OG|ON|OS|OY|PL|RI|SK|TA|YB|ZA)(0[1-9]|[1-9][0-9])[A-Z][0-9]{2}[A-Z]{2}(0[1-9]|[1-9][0-9])$");
DEFINE FIELD OVERWRITE dest_postal ON shipment TYPE string ASSERT string::matches($value, "^(AB|AD|AK|AN|BA|BY|BE|BR|CR|DE|EB|ED|EK|EN|FC|GM|IM|JI|KD|KN|KT|KE|KG|KW|LA|NA|NI|OG|ON|OS|OY|PL|RI|SK|TA|YB|ZA)(0[1-9]|[1-9][0-9])[A-Z][0-9]{2}[A-Z]{2}(0[1-9]|[1-9][0-9])$");
DEFINE FIELD OVERWRITE origin_label ON shipment TYPE string;
DEFINE FIELD OVERWRITE dest_label ON shipment TYPE string;
DEFINE FIELD OVERWRITE pickup_ngn ON shipment TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE distance_ngn ON shipment TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE hub_ngn ON shipment TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE platform_fee_ngn ON shipment TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE hidden_fee_ngn ON shipment TYPE number DEFAULT 0 ASSERT $value = 0;
DEFINE FIELD OVERWRITE total_ngn ON shipment COMPUTED pickup_ngn + distance_ngn + hub_ngn + platform_fee_ngn + hidden_fee_ngn;
DEFINE FIELD OVERWRITE distance_km ON shipment TYPE int DEFAULT 0;
DEFINE FIELD OVERWRITE pay_method ON shipment TYPE string ASSERT $value IN ['cash', 'transfer', 'pod'];
DEFINE FIELD OVERWRITE proof ON shipment TYPE string ASSERT $value IN ['cartons', 'jerrycan', 'sack', 'parcel', 'crate', 'hub'];
DEFINE FIELD OVERWRITE caption ON shipment TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE on_feed ON shipment TYPE bool DEFAULT true;
DEFINE FIELD OVERWRITE formula ON shipment TYPE string ASSERT $value = 'koro-v1';
DEFINE FIELD OVERWRITE created_at ON shipment TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE shipment_status ON shipment FIELDS status;
DEFINE INDEX OVERWRITE shipment_author ON shipment FIELDS author;

DEFINE EVENT OVERWRITE freeze_shipment_price ON shipment WHEN $event = "UPDATE" THEN {
  IF $before.status IN ['locked', 'moving', 'delivered', 'disputed'] AND ($after.pickup_ngn != $before.pickup_ngn OR $after.distance_ngn != $before.distance_ngn OR $after.hub_ngn != $before.hub_ngn OR $after.platform_fee_ngn != $before.platform_fee_ngn OR $after.hidden_fee_ngn != $before.hidden_fee_ngn) {
    THROW "Price is already locked on this drop";
  };
};

DEFINE TABLE OVERWRITE story SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE author ON story TYPE record<person>;
DEFINE FIELD OVERWRITE shipment ON story TYPE record<shipment>;
DEFINE FIELD OVERWRITE label ON story TYPE string;
DEFINE FIELD OVERWRITE caption ON story TYPE string;
DEFINE FIELD OVERWRITE from_postal ON story TYPE string ASSERT string::len($value) = 11;
DEFINE FIELD OVERWRITE to_postal ON story TYPE string ASSERT string::len($value) = 11;
DEFINE FIELD OVERWRITE created_at ON story TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE reel SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE author ON reel TYPE record<person>;
DEFINE FIELD OVERWRITE shipment ON reel TYPE record<shipment>;
DEFINE FIELD OVERWRITE title ON reel TYPE string;
DEFINE FIELD OVERWRITE proof ON reel TYPE string;
DEFINE FIELD OVERWRITE caption ON reel TYPE string;
DEFINE FIELD OVERWRITE created_at ON reel TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE comment SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE shipment ON comment TYPE record<shipment>;
DEFINE FIELD OVERWRITE author ON comment TYPE record<person>;
DEFINE FIELD OVERWRITE body ON comment TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE created_at ON comment TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE saved_drop SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE person ON saved_drop TYPE record<person>;
DEFINE FIELD OVERWRITE shipment ON saved_drop TYPE record<shipment>;
DEFINE INDEX OVERWRITE saved_pair ON saved_drop FIELDS person, shipment UNIQUE;

DEFINE TABLE OVERWRITE deal SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE shipment ON deal TYPE record<shipment>;
DEFINE FIELD OVERWRITE participants ON deal TYPE array<record<person>>;
DEFINE FIELD OVERWRITE locked ON deal TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE pickup_ngn ON deal TYPE number;
DEFINE FIELD OVERWRITE distance_ngn ON deal TYPE number;
DEFINE FIELD OVERWRITE hub_ngn ON deal TYPE number;
DEFINE FIELD OVERWRITE platform_fee_ngn ON deal TYPE number;
DEFINE FIELD OVERWRITE hidden_fee_ngn ON deal TYPE number DEFAULT 0 ASSERT $value = 0;
DEFINE FIELD OVERWRITE total_ngn ON deal COMPUTED pickup_ngn + distance_ngn + hub_ngn + platform_fee_ngn + hidden_fee_ngn;
DEFINE FIELD OVERWRITE pay_method ON deal TYPE string ASSERT $value IN ['cash', 'transfer', 'pod'];
DEFINE FIELD OVERWRITE formula ON deal TYPE string ASSERT $value = 'koro-v1';

DEFINE EVENT OVERWRITE freeze_locked_price ON deal WHEN $event = "UPDATE" THEN {
  IF $before.locked = true AND $after.locked = false {
    THROW "A locked price stays locked";
  };
  IF $before.locked = true AND ($after.pickup_ngn != $before.pickup_ngn OR $after.distance_ngn != $before.distance_ngn OR $after.hub_ngn != $before.hub_ngn OR $after.platform_fee_ngn != $before.platform_fee_ngn OR $after.hidden_fee_ngn != $before.hidden_fee_ngn) {
    THROW "Locked price cannot change";
  };
};

DEFINE TABLE OVERWRITE message SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE thread ON message TYPE record<deal>;
DEFINE FIELD OVERWRITE author ON message TYPE option<record<person>>;
DEFINE FIELD OVERWRITE body ON message TYPE string;
DEFINE FIELD OVERWRITE kind ON message TYPE string ASSERT $value IN ['text', 'lock', 'system'];
DEFINE FIELD OVERWRITE created_at ON message TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE notice SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE person ON notice TYPE record<person>;
DEFINE FIELD OVERWRITE body ON notice TYPE string;
DEFINE FIELD OVERWRITE href ON notice TYPE string;
DEFINE FIELD OVERWRITE read ON notice TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE created_at ON notice TYPE datetime DEFAULT time::now();

DEFINE TABLE OVERWRITE capacity SCHEMAFULL PERMISSIONS FULL;
DEFINE FIELD OVERWRITE rider ON capacity TYPE record<person>;
DEFINE FIELD OVERWRITE from_state ON capacity TYPE string ASSERT $value IN ['AB','AD','AK','AN','BA','BY','BE','BR','CR','DE','EB','ED','EK','EN','FC','GM','IM','JI','KD','KN','KT','KE','KG','KW','LA','NA','NI','OG','ON','OS','OY','PL','RI','SK','TA','YB','ZA'];
DEFINE FIELD OVERWRITE to_state ON capacity TYPE string ASSERT $value IN ['AB','AD','AK','AN','BA','BY','BE','BR','CR','DE','EB','ED','EK','EN','FC','GM','IM','JI','KD','KN','KT','KE','KG','KW','LA','NA','NI','OG','ON','OS','OY','PL','RI','SK','TA','YB','ZA'];
DEFINE FIELD OVERWRITE spare_kg ON capacity TYPE number ASSERT $value >= 0;
DEFINE FIELD OVERWRITE leaves ON capacity TYPE string;
DEFINE FIELD OVERWRITE note ON capacity TYPE string;
