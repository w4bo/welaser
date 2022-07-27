create database if not exists agritech_dwh;

use agritech_dwh;

drop table if exists location;
create table location (
    location_id varchar(255) primary key,
    location_name varchar(255),
    location_type varchar(255),
    polygon text,
    raw_json text
);

drop table if exists isIN;
create table isIN (
    location_parent varchar(255),
    location_child varchar(255),
    primary key(location_parent, location_child)
);

drop table if exists logical_device;
create table logical_device (
    logical_device_id varchar(255) primary key,
    logical_device_type varchar(255),
    logical_device_name varchar(255),
    isin varchar(255) references logical_device(logical_device_id)
);

drop table if exists physical_device;
create table physical_device (
  physical_device_id varchar(255) primary key,
  physical_device_name varchar(255)
);

drop table if exists generic_attribute;
create table generic_attribute (
  logical_device_id varchar(255) references logical_device(logical_device_id),
  physical_device_id varchar(255) references physical_device(physical_device_id),
  generic_attribute_id varchar(255) primary key,
  generic_attribute_name varchar(255),
  generic_attribute_value varchar(255)
);

drop table if exists assigned_device;
create table assigned_device (
  assigned_device_id varchar(255) primary key,
  logical_device_id varchar(255) references logical_device(logical_device_id),
  physical_device_id varchar(255) references physical_device(physical_device_id),
  assignment_timestamp bigint,
  location_id varchar(255) references location(location_id)
);

drop table if exists measurement;
create table measurement (
  assigned_device_id varchar(255),
  reception_timestamp bigint,
  sensing_timestamp bigint,
  measurement_value double,
  accuracy double,
  measurement_type_id varchar(255) references measurement_type(measurement_type_id),
  location_id varchar(255) references location(location_id),
  raw_json text,
  primary key(assigned_device_id, sensing_timestamp, measurement_type_id)
);

drop table if exists measurement_type;
create table measurement_type (
  measurement_type_id varchar(255),
  unit varchar(255),
  primary key(measurement_type_id, unit)
);

select * from measurement;
select * from measurement_type;
select t1.*, t2.* from measurement t1, location t2 where t1.location_id = t2.location_id;