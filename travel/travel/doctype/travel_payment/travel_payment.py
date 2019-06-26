# -*- coding: utf-8 -*-
# Copyright (c) 2019, Bilal Ghayad and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class TravelPayment(Document):
	pass



@frappe.whitelist()
def get_account_currency(account):

	account_currency = frappe.db.get_value("Account", account, 'account_currency')
	return account_currency
