module WkaccountingHelper

include WktimeHelper

	def getLedgerTypeHash
		ledgerType = {
			"BA" => l(:label_bank_ac),
			"OC" => l(:label_bank_occ_ac),
			"OD" => l(:label_bank_od_ac),
			"BR" => l(:label_branch_division),
			"C" => l(:label_capital_account),
			"CS" => l(:label_cash_in_hand),
			"CA" => l(:label_current_assets),
			"CL" => l(:label_current_liabilities),
			"DP" => l(:label_deposits),
			"DE" => l(:label_direct_expenses),
			"DI" => l(:label_direct_incomes),
			"T" => l(:label_duties_taxes),
			"FA" => l(:label_fixed_assets),
			"IE" => l(:label_indirect_expenses),
			"II" => l(:label_indirect_incomes),
			"IN" => l(:label_investments),
			"AD" => l(:label_loans_advances),
			"L" => l(:label_loans),
			"MS" => l(:label_misc_expenses),
			"PR" => l(:label_provisions),
			"PA" => l(:label_purchase_accounts),
			"RS" => l(:label_reserves_surplus),
			"RE" => l(:label_retained_earnings),
			"SA" => l(:label_sales_accounts),
			"SL" => l(:label_secured_loans),
			"SH" => l(:label_stock_in_hand),
			"SC" => l(:label_sundry_creditors),
			"SD" => l(:label_sundry_debtors),
			"SP" => l(:label_suspense_ac),
			"UL" => l(:label_unsecured_loans)
			}
		ledgerType
	end
	
	def getLedgerTypeGrpHash
		ledgerTypeGrps = {
			"CA" => ['BA', 'CS', 'DP', 'AD', 'SH', 'SD', 'IN', 'MS'],
			"L" => ['OD', 'SL', 'UL', 'OC'],
			"CL" => ['T', 'PR', 'SC'],
			"C" => ['RS', 'RE'],
			"PL" => ['DI', 'DE', 'II', 'IE', 'SA', 'PA']
		}
		ledgerTypeGrps
	end
	
	def incomeLedgerTypes
		['SA','DI','II']
	end
	
	def expenseLedgerTypes
		['PA','DE','IE']
	end
	
	def getSubEntries(from, asOnDate, ledgerType)
		subEntriesHash = nil
		bsEndDate = ledgerType == 'PL' ? from : asOnDate
		unless getLedgerTypeGrpHash[ledgerType].blank?
			subEntriesHash = Hash.new
			getLedgerTypeGrpHash[ledgerType].each do |subType|
				subEntriesHash[subType] = getEachLedgerBSAmt(bsEndDate, [subType])
			end
		end
		if ledgerType == 'PL'
			totalIncome = 0
			totalExpense = 0
			incomeLedgerTypes.each do |type|
				totalIncome = totalIncome + getEntriesTotal(subEntriesHash[type])
			end
			expenseLedgerTypes.each do |type|
				totalExpense = totalExpense + getEntriesTotal(subEntriesHash[type])
			end
			subEntriesHash.clear
			subEntriesHash[l(:wk_label_opening)+ " " + l(:wk_field_balance)] = totalIncome - totalExpense
			subEntriesHash[l(:label_period)+ " " + l(:label_period)] = getPLfor(from, asOnDate)
			
		end
		subEntriesHash
	end
	
	def getPLfor(from, to)
		totalIncome = 0
		totalExpense = 0
		incomeLedgerTypes.each do |type|
			income = getEachLedgerSumAmt(from, to, [type])
			totalIncome = totalIncome + income.values.inject(:+) unless income.blank?
		end
		
		expenseLedgerTypes.each do |type|
			expense = getEachLedgerSumAmt(from, to, [type])
			totalExpense = totalExpense + expense.values.inject(:+) unless expense.blank?
		end
		profit = totalIncome - totalExpense
		profit
	end
	
	def getEntriesTotal(entriesHash)
		total = 0
		entriesHash.each do |entry|
			total = entry[1].values.inject(:+) + total unless entry[1].blank?
		end
		total
	end
	
	def getTransDetails(from, to)
		WkGlTransactionDetail.includes(:ledger, :wkgltransaction).where('wk_gl_transactions.trans_date between ? and ?', from, to).references(:ledger,:wkgltransaction)
	end
	
	def getBSProfitLoss(from, to)
		WkGlTransactionDetail.includes(:ledger, :wkgltransaction).where('wk_gl_transactions.trans_date between ? and ?', from, to).references(:ledger,:wkgltransaction)
	end
	
	def getEachLedgerBSAmt(asOnDate, ledgerType)
		typeArr = ['c', 'd']
		detailHash = Hash.new
		typeArr.each do |type|
			detailHash[type] = WkGlTransactionDetail.includes(:ledger, :wkgltransaction).where('wk_gl_transaction_details.detail_type = ? and wk_ledgers.ledger_type IN (?) and wk_gl_transactions.trans_date <= ?', type, ledgerType, asOnDate).references(:ledger,:wkgltransaction).group('wk_ledgers.id').sum('wk_gl_transaction_details.amount')
		end
		profitHash = detailHash['c'].merge(detailHash['d']){|key, oldval, newval| newval - oldval}
		balHash = Hash.new
		profitHash.each do |key, val|
			ledger = WkLedger.find(key)
			balHash[ledger.name] = val + (ledger.opening_balance.blank? ? 0 : ledger.opening_balance)
		end
		balHash
	end
	
	def getEachLedgerSumAmt(from, to, ledgerType)
		typeArr = ['c', 'd']
		detailHash = Hash.new
		if ledgerType.blank?
			typeArr.each do |type|
				detailHash[type] = WkGlTransactionDetail.includes(:ledger, :wkgltransaction).where('wk_gl_transaction_details.detail_type = ? and wk_gl_transactions.trans_date between ? and ?', type, from, to).references(:ledger,:wkgltransaction).group('wk_ledgers.id, wk_ledgers.name').sum('wk_gl_transaction_details.amount')
			end
		else
			typeArr.each do |type|
				detailHash[type] = WkGlTransactionDetail.includes(:ledger, :wkgltransaction).where('wk_gl_transaction_details.detail_type = ? and wk_ledgers.ledger_type IN (?) and wk_gl_transactions.trans_date between ? and ?', type, ledgerType, from, to).references(:ledger,:wkgltransaction).group('wk_ledgers.id, wk_ledgers.name').sum('wk_gl_transaction_details.amount')
			end
		end
		profitHash = detailHash['c'].merge(detailHash['d']){|key, oldval, newval| oldval - newval}
		profitHash
	end
	
	def getTransType(crLedgerType, dbLedgerType)
		transtype = nil
		if (crLedgerType == 'C' || crLedgerType == 'BA') && (dbLedgerType == 'C' || dbLedgerType == 'BA')
			transtype = 'C'
		elsif (crLedgerType == 'C' || crLedgerType == 'BA')
			transtype = 'P'
		elsif (dbLedgerType == 'C' || dbLedgerType == 'BA')
			transtype = 'R'
		else
			transtype = 'J'
		end
		transtype
	end
end
