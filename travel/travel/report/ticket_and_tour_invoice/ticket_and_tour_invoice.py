# Copyright (c) 2013, Bilal Ghayad and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import flt, cint, getdate, now

def execute(filters=None):
	if not filters: filters = {}

	validate_filters(filters)

#	data = []
#	columns, data = [], []
#	data = get_data()
	columns = get_columns()
#	data.append({"date":"2019-06-23", "customer": "Bilal Ghayad", "carrier_name": "Middle East", "gds": "W"})

#	test = get_data()
	data = get_data(filters)
	return columns, data

def get_columns():
	columns = [
		{"label": _("Date"), "fieldname": "date", "fieldtype": "Date", "width": 95},
		{"label": _("Customer ID"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 130},
		{"label": _("Customer Name"), "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
		{"label": _("Customer Balance"), "fieldname": "customer_balance", "fieldtype": "Currency", "width": 130},
		{"label": _("Invoice No"), "fieldname": "invoice_no", "fieldtype": "Link", "options": "Ticket Invoice", "width": 150},
		{"label": _("Invoice Amount"), "fieldname": "invoice_amount", "fieldtype": "Currency", "width": 150},
		{"label": _("Invoice Status"), "fieldname": "invoice_status", "fieldtype": "Data", "width": 130},
		{"label": _("Ticket No"), "fieldname": "ticket_no", "fieldtype": "Data", "width": 150},
		{"label": _("Ticket Amount"), "fieldname": "ticket_amount", "fieldtype": "Currency", "width": 150},
		{"label": _("Pax Name"), "fieldname": "pax_name", "fieldtype": "Data", "width": 150},
		{"label": _("Route"), "fieldname": "route", "fieldtype": "Data", "width": 130},
		{"label": _("GDS"), "fieldname": "gds", "fieldtype": "Data", "width": 100},
		{"label": _("Carrier ID"), "fieldname": "carrier", "fieldtype": "Link", "options": "Carrier Settings", "width": 100},
		{"label": _("Carrier Name"), "fieldname": "carrier_name", "fieldtype": "Data", "width": 150},
		{"label": _("Carrier Code"), "fieldname": "carrier_code", "fieldtype": "Data", "width": 100},
		{"label": _("Company"), "fieldname": "company", "fieldtype": "Link", "options": "Company", "width": 110}
	]
	
	return columns

def get_data(filters):
#	conditions = []
#	if filters.get("item_code"):
#		conditions.append("item.name=%(item_code)s")
#	else:
#	if filters.get("brand"):
#		conditions.append("item.brand=%(brand)s")
#	if filters.get("item_group"):
#		conditions.append(get_item_group_condition(filters.get("item_group")))
#	items = []
#	if conditions:
#		items = frappe.db.sql_list("""select name from `tabItem` item where {}"""
#			.format(" and ".join(conditions)), filters)


	conditions = []
	conditions.append("a.docstatus =1 and c.carrier_no = (LEFT(b.ticket_no,INSTR(b.ticket_no,'-')-1))")
	if filters.get("customer"):
		conditions.append("a.customer=%(customer)s")
	if filters.get("carrier"):
		conditions.append("c.name=%(carrier)s")
	if filters.get("from_date") and filters.get("from_date") <= filters.get("to_date"):
		conditions.append("a.posting_date >= %(from_date)s and a.posting_date <= %(to_date)s")
#		if filters.get("item_group"):
#			conditions.append(get_item_group_condition(filters.get("item_group")))
 #       items = []

#	frappe.msgprint("Condition is {0}". format(conditions))


	info = frappe.db.sql("""
		select posting_date as date, customer as customer, customer_name as customer_name, a.name as invoice_no, cust_grand_total as invoice_amount, 
		uatp_total_amount as total_uatp,
		b.ticket_no as ticket_no, b.uatp_amount as uatp, b.supp_total_amount as supp_total_amount, b.cust_total_amount as ticket_amount, 
		c.carrier_name as carrier_name, LEFT(b.ticket_no,INSTR(b.ticket_no,"-")-1) AS carrier_code, c.name as carrier, b.pax_name as pax_name,
		b.gds as gds, b.routing as route, a.status as invoice_status, a.customer_balance, a.company as company
		from `tabCarrier Settings` c, `tabTicket Invoice` a
		INNER JOIN `tabTicket Invoice Ticket` b
		on b.parent = a.name
		where {} order by a.posting_date asc""" 
		.format(" and ".join(conditions)), filters, as_dict=True)
#	frappe.msgprint("Info is {0}". format(info))

	return info

def validate_filters(filters):
	if not (filters.get("customer") or filters.get("carrier")):
		ticket_count = flt(frappe.db.sql("""select count(name) from `tabTicket Invoice` where docstatus =1""")[0][0])
		if ticket_count > 100000:
			frappe.throw(_("Please set filter based on Customer or Carrier or Dates"))

