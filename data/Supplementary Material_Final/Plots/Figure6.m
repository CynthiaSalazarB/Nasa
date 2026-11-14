%% Created by SK
%% Cut-off plots
clear all
close all
clc

addpath ('.\Dependencies')
load ('.\Dependencies\SubjectLevelScore.mat')

numNights = 7;
Data_RF = xx2(1:5,:);  % RF first 5 rows
Data_SV = xx2(6:end,:); % SV 6:end

figure, plot (Data_RF(:,1)'*100, '-^r','LineWidth',3); % Acc
hold on, plot (Data_RF(:,2)'*100, '-or','LineWidth',2); % Sens
hold on, plot (Data_RF(:,3)'*100, '-+r','LineWidth',1); % Spec
grid on;
h = zeros(3, 1);
h(1) = plot(NaN,NaN,'-^r','LineWidth',3);
h(2) = plot(NaN,NaN,'-or','LineWidth',2);
h(3) = plot(NaN,NaN,'-+r','LineWidth',1);
legend(h, {'$Accuracy-RF$','$Sensitivity-RF$','$Specificity-RF$'}, 'Interpreter', 'Latex');
set(gca,'XTick',[1:1:numNights]);
set(gca,'XTickLabel',[7:-1:3]);
xtickangle (45);
ylabel ('Score');
xlabel ('Nights');
ylim ([20 100])

