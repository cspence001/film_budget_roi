Attribute VB_Name = "Module2"
Sub alpha_test()
Dim ws As Worksheet
'to loop through all worksheets in workbook
For Each ws In ThisWorkbook.Worksheets
    ws.Activate
   
'set headers
Cells(1, 10).Value = "Ticker"
Cells(1, 11).Value = "Yearly Change"
Cells(1, 12).Value = "Percent Change"
Cells(1, 13).Value = "Total Stock Volume"

'declare variables
Dim Column As Integer
Column = 1
MessageRow = 2
lastrow = Cells(Rows.Count, 1).End(xlUp).Row
total_volume = 0
max_increase = 0
max_decrease = 0
max_volume = 0


'set open price for first ticker
open_price = Cells(2, 3).Value

    For i = 2 To lastrow

        'tickers
        If Cells(i + 1, Column).Value <> Cells(i, Column).Value Then
            Cells(MessageRow, 10).Value = Cells(i, Column).Value
        
            'adds total stock volumes for each ticker
            total_volume = total_volume + Cells(i, 7).Value
            'places total_volume in coordinating cell
            Cells(MessageRow, 13).Value = total_volume
            'set close price
            close_price = Cells(i, 6).Value
            'set yearly_change
            yearly_change = close_price - open_price
            'place_yearly_change
            Cells(MessageRow, 11).Value = yearly_change
            'set percent_change
            If open_price <> 0 Then
                percent_change = (yearly_change / open_price)
            End If
        
            'set red for negative values
            If (yearly_change <= 0) Then
                Cells(MessageRow, 11).Interior.ColorIndex = 3
            'set green for positive values
            ElseIf (yearly_change >= 0) Then
                Cells(MessageRow, 11).Interior.ColorIndex = 4
            End If
        
            'place percent_change
            Cells(MessageRow, 12).Value = percent_change
            'format to show percentage and 2 decimal places
            Cells(MessageRow, 12).NumberFormat = "0.00%"
            'set open_price for rest of tickers
            open_price = Cells(i + 1, 3).Value
            
            'find Greatest % Increase
            If (percent_change > max_increase) Then
                max_increase = percent_change
                'link with corresponding ticker
                max_ticker = Cells(MessageRow, 10).Value
                'place values for ticker and percentage
                Cells(2, 16).Value = max_ticker
                Cells(2, 17).Value = max_increase
                Cells(2, 17).NumberFormat = "0.00%"
            'Find greatest % Decrease
            ElseIf (percent_change < max_decrease) Then
                max_decrease = percent_change
                'link with corresponding ticker
                min_ticker = Cells(MessageRow, 10).Value
                'place values for ticker and percentage
                Cells(3, 16).Value = min_ticker
                Cells(3, 17).Value = max_decrease
                Cells(3, 17).NumberFormat = "0.00%"
            End If
            If (total_volume > max_volume) Then
                max_volume = total_volume
                max_ticker = Cells(MessageRow, 10).Value
                Cells(4, 16).Value = max_ticker
                Cells(4, 17).Value = max_volume
            End If
        
            'for each row
            MessageRow = MessageRow + 1
        
            'resets total_volume
            total_volume = 0
            'resets percent_change
            percent_change = 0
        Else
            total_volume = total_volume + Cells(i, 7).Value
        End If
    Next i
    'autofits column width / comment out for testing: delays run time
    Columns("J:Q").EntireColumn.AutoFit


'set headers for bonus
Cells(1, 15).Value = " "
Cells(2, 15).Value = "Greatest % Increase"
Cells(3, 15).Value = "Greatest % Decrease"
Cells(4, 15).Value = "Greatest Total Volume"
Cells(1, 16).Value = "Ticker"
Cells(1, 17).Value = "Value"
   
    Next ws

End Sub

