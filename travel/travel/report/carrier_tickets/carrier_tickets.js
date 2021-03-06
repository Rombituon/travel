// Copyright (c) 2016, Bilal Ghayad and contributors
// For license information, please see license.txt
/* eslint-disable */
frappe.query_reports["Carrier Tickets"] = {
	"filters": [
                {
			"fieldname":"from_date",
		        "label": __("From Date"),
		        "fieldtype": "Date",
		        "width": "80",
		        "reqd": 1,
		        "default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
		},
                {
		        "fieldname":"to_date",
		        "label": __("To Date"),
		        "fieldtype": "Date",
		        "width": "80",
			"reqd": 1,
		        "default": frappe.datetime.get_today()
		},
                {
		        "fieldname": "customer",
		        "label": __("Customer"),
		        "fieldtype": "Link",
		        "width": "80",
		        "options": "Customer",
		        "get_query": function() {
				return {
					query: "erpnext.controllers.queries.customer_query"
				}
			}
		},
                {
		        "fieldname": "carrier",
		        "label": __("Carrier"),
		        "fieldtype": "Link",
		        "width": "80",
		        "options": "Carrier Settings"
		},
                {
			"fieldname":"gds",
		        "label": __("GDS"),
		        "fieldtype": "Select",
		        "options": ["", "S", "W"]
		}
	]
}
