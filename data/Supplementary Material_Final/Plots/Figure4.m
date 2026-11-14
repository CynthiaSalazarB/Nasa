clear all
close all
clc

addpath ('.\Dependencies')
load ('.\Dependencies\barData.mat')

figure, b=bar (barData);
set(b, {'DisplayName'}, {'InF1','InF2','InF3','InF4'}');
legend ()

set(gca,'XTickLabel',feaNames);
xtickangle (45);
ylabel ('AUC');
ylim ([0.5 0.9]);