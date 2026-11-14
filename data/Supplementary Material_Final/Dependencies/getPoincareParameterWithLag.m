function [CCM,SD1,SD2,CCMun]=getPoincareParameterWithLag(data,lag)

len=length(data);
x=data(1:len-lag);
y=data(lag+1:len);
if size(x,2)>1
    x=x';
    y=y';
end

xc=mean(x);
yc=mean(y);
tdist=0;
for i=1:length(x)
    xi=x(i);
    yi=y(i);
    dist=abs((xi-yi)/(2^0.5));
    tdist=tdist+dist^2.0;
end
SD1=sqrt(tdist/length(x));
tdist=0;
for i=1:length(x)
    xi=x(i);
    yi=y(i);
    dist=abs((xi+yi-xc-yc)/(2^0.5));
    tdist=tdist+dist^2.0;
end
SD2=sqrt(tdist/length(x));
%}

Area=[];
for j=1:length(x)-2
    points=[x(j:j+2) y(j:j+2) [1;1;1]];
    a=0.5*det(points);
    Area=[Area;a];
    %fprintf('%d\n',j);
end
CCM=mean(abs(Area))/(pi*SD1*SD2);
CCMun=mean(abs(Area));

