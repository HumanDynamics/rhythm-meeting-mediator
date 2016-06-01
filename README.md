# Rhythm Meeting Mediator

Google hangouts plugin the Rhythm framework

## Setup

1. Install npm
2. Run `npm install`
3. Install bower
4. Run `bower install`

## Building & Deployment

First, spin up a new Amazon S3 bucket, and enter this as the CORS configuration:

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>

```

1. Install aws CLI tools, configure your user credentials

```
pip install aws-cli
```

2. create a .env file with the variables `RHYTHM_SERVER_URL` and `RHYTHM_MM_HOSTING_URL`:

```
RHYTHM_SERVER_URL=https://something.compute-1.amazonaws.com
RHYTHM_MM_HOSTING_URL=https://s3.amazonaws.com/my-s3-bucket
```

where `RHYTHM_SERVER_URL` is a live [Rhythm Server](https://github.com/HumanDynamics/rhythm-server) instance.

make sure to use the `https://s3.amazonaws.com/...` URL style for S3,
as this enables https, which is required by Google Hangout.

3. to build and deploy, run:

```
gulp build && gulp deploy
```

If you want to use an AWS role other than the default role you have in
your local AWS CLI configuration, set an environment variable before
running `gulp deploy`:

```
gulp build && AWS_PROFILE=myprofile gulp deploy
```

- Ensure the google console link to the plugin.xml file is updated
- The .env file should have an environment variable `RHYTHM_SERVER_URL` which is a https url to the rhythm server
