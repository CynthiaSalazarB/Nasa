clc
clear all
close all

addpath ('.\Dependencies');
load ('.\Dependencies\Score.mat')

figure, plot (Score_RF(1,:)*100, '-^r','LineWidth',2)
hold on, plot (Score_RF(2,:)*100, '-ob','LineWidth',2)
plot (Score_RF(3,:)*100, '-+g','LineWidth',2)
grid on;
h = zeros(3, 1);
h(1) = plot(NaN,NaN,'-^r','LineWidth',2);
h(2) = plot(NaN,NaN,'-ob','LineWidth',2);
h(3) = plot(NaN,NaN,'-+g','LineWidth',2);
legend(h, {'$Accuracy$','$Sensitivity$','$Specificity$'}, 'Interpreter', 'Latex');
ylabel ('Score (%)')
xlabel ('Night Threshold (Th)');
ylim ([0 100]);