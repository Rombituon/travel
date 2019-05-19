from __future__ import unicode_literals
from frappe import _

def get_data():
	return [
		{
			"label": _("Invoices"),
			"icon": "fa fa-star",
			"items": [
				{
					"type": "doctype",
					"name": "Ticket Invoice",
					"description": _("Ticket Invoice")
				},
				{
					"type": "doctype",
					"name": "Tour Invoice",
					"description": _("Tour Invoice")
				}
			]
		},
		{
			"label": _("Setup"),
			"icon": "fa fa-star",
			"items": [
				{
					"type": "doctype",
					"name": "Carrier Settings",
					"description": _("Carrier Settings")
				}
			]
		}
	]
