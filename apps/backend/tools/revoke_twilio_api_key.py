#!/usr/bin/env python3
"""Revoke (delete) a Twilio API Key by SID.

Usage:
  TW_ACCOUNT_SID=AC... TW_AUTH_TOKEN=... python revoke_twilio_api_key.py --key-sid SKxxxx
"""
import os
import sys
import argparse
import requests
from dotenv import load_dotenv

load_dotenv()


def revoke_key(account_sid: str, auth_token: str, key_sid: str):
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Keys/{key_sid}.json"
    resp = requests.delete(url, auth=(account_sid, auth_token))
    if resp.status_code in (200, 204):
        return True
    resp.raise_for_status()


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--account-sid')
    parser.add_argument('--auth-token')
    parser.add_argument('--key-sid', required=True)
    args = parser.parse_args(argv)

    account_sid = args.account_sid or os.environ.get('TW_ACCOUNT_SID')
    auth_token = args.auth_token or os.environ.get('TW_AUTH_TOKEN')
    if not account_sid or not auth_token:
        print('TW_ACCOUNT_SID and TW_AUTH_TOKEN required')
        sys.exit(2)

    success = revoke_key(account_sid, auth_token, args.key_sid)
    print('revoked' if success else 'failed')


if __name__ == '__main__':
    main()
